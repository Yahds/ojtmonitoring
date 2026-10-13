<?php
use PHPUnit\Framework\TestCase;
require_once __DIR__ . '/../src/db/index.php';

// runs the app on PHP's built-in server and sends real requests to it
class HttpTest extends TestCase
{
    private const HOST = '127.0.0.1:8099';
    private static $server;
    private string $cookie = '';

    public static function setUpBeforeClass(): void
    {
        $public = __DIR__ . '/../public';
        self::$server = proc_open(
            [PHP_BINARY, '-S', self::HOST, '-t', $public, "$public/index.php"],
            [['pipe', 'r'], ['file', '/dev/null', 'w'], ['file', '/dev/null', 'w']],
            $pipes
        );
        for ($try = 0; $try < 50; $try++) {
            if (@fsockopen('127.0.0.1', 8099)) {
                return;
            }
            usleep(100000);
        }
        throw new RuntimeException('The test server did not start.');
    }

    public static function tearDownAfterClass(): void
    {
        proc_terminate(self::$server);
    }

    private function request(string $method, string $path, array $form = []): array
    {
        $curl = curl_init('http://' . self::HOST . $path);
        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_COOKIE => $this->cookie,
        ]);
        if ($method === 'POST') {
            curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($form));
        }
        $response = curl_exec($curl);
        $headerSize = curl_getinfo($curl, CURLINFO_HEADER_SIZE);
        $headers = substr($response, 0, $headerSize);

        // keep the newest session cookie
        if (preg_match_all('/^Set-Cookie: ([^;]+)/mi', $headers, $cookies)) {
            $this->cookie = end($cookies[1]);
        }
        return [
            'status' => curl_getinfo($curl, CURLINFO_RESPONSE_CODE),
            'location' => preg_match('/^Location: (.+)$/mi', $headers, $match) ? trim($match[1]) : null,
            'body' => substr($response, $headerSize),
        ];
    }

    private function tokenFrom(string $body): string
    {
        preg_match('/name="csrf_token" value="([^"]+)"/', $body, $match);
        return $match[1];
    }

    private function logIn(string $id, string $password): array
    {
        $token = $this->tokenFrom($this->request('GET', '/login')['body']);
        return $this->request('POST', '/login', ['csrf_token' => $token, 'id' => $id, 'password' => $password]);
    }

    public function testLoginPageLoads(): void
    {
        $response = $this->request('GET', '/login');

        $this->assertSame(200, $response['status']);
        $this->assertStringContainsString('Student ID', $response['body']);
    }

    public function testLoggedOutVisitorIsSentToLogin(): void
    {
        $response = $this->request('GET', '/requirements');

        $this->assertSame(302, $response['status']);
        $this->assertSame('/student/login', $response['location']);
    }

    public function testLoginWithoutCsrfTokenIsRefused(): void
    {
        $response = $this->request('POST', '/login', ['id' => '2299001', 'password' => '1234']);

        $this->assertSame(403, $response['status']);
    }

    public function testWrongPasswordShowsAnError(): void
    {
        $response = $this->logIn('2299001', 'wrong-password');

        $this->assertSame(401, $response['status']);
        $this->assertStringContainsString('Your student ID or password is wrong', $response['body']);
    }

    public function testRightPasswordOpensTheRequirementsPage(): void
    {
        $this->assertSame(302, $this->logIn('2299001', '1234')['status']);
        $this->assertSame(200, $this->request('GET', '/requirements')['status']);
    }

    public function testLogoutEndsTheSession(): void
    {
        $this->logIn('2299001', '1234');
        $token = $this->tokenFrom($this->request('GET', '/requirements')['body']);

        $this->request('POST', '/logout', ['csrf_token' => $token]);

        $this->assertSame(302, $this->request('GET', '/requirements')['status']);
    }
    
    public function testTooShortNewPasswordIsRefused(): void
    {
        $this->logIn('2299001', '1234');
        $token = $this->tokenFrom($this->request('GET', '/account/password')['body']);

        $response = $this->request('POST', '/account/password', [
            'csrf_token' => $token,
            'currentPassword' => '1234',
            'newPassword' => 'short',
            'confirmPassword' => 'short',
        ]);

        $this->assertSame(400, $response['status']);
        $this->assertStringContainsString('Use at least 15 characters.', $response['body']);
    }

    public function testLoggedInPagesIncludeTheIdleWarning(): void
    {
        $this->logIn('2299001', '1234');

        $this->assertStringContainsString('id="idle-warning"', $this->request('GET', '/requirements')['body']);
    }

    public function testKeepAliveAnswersWithNoContentWhenLoggedIn(): void
    {
        $this->logIn('2299001', '1234');

        $this->assertSame(204, $this->request('GET', '/session/keep-alive')['status']);
    }

    public function testKeepAliveSendsLoggedOutVisitorsToLogin(): void
    {
        $this->assertSame(302, $this->request('GET', '/session/keep-alive')['status']);
    }

    public function testAFinishedInternSeesTheirDashboardButCannotSubmit(): void
    {
        db()->execute_query("UPDATE interns SET status = 'FINISHED', finished_on = '2026-12-18' WHERE internid = 300");
        try {
            $this->logIn('2299001', '1234');

            $this->assertSame('/student/dashboard', $this->request('GET', '/')['location']);
            $this->assertStringContainsString('You finished your OJT on December 18, 2026', $this->request('GET', '/dashboard')['body']);
            $this->assertStringNotContainsString('Submit a report', $this->request('GET', '/weekly-reports')['body']);
        } finally {
            db()->execute_query("UPDATE interns SET status = 'PENDING', finished_on = NULL WHERE internid = 300");
        }
    }

    public function testAnInternStillOnboardingCanReadAnnouncements(): void
    {
        db()->execute_query("INSERT INTO announcements (senderid, subject, message) VALUES (1, 'Http test post', 'hello')");
        try {
            $this->logIn('2299001', '1234');
            $response = $this->request('GET', '/announcements');

            $this->assertSame(200, $response['status']);
            $this->assertStringContainsString('Http test post', $response['body']);
        } finally {
            db()->execute_query("DELETE FROM announcements WHERE subject = 'Http test post'");
        }
    }

    public function testAWithdrawnInternOnlySeesTheWithdrawnPage(): void
    {
        db()->execute_query("UPDATE interns SET status = 'WITHDRAWN' WHERE internid = 300");
        try {
            $this->logIn('2299001', '1234');
            $response = $this->request('GET', '/requirements');

            $this->assertSame(403, $response['status']);
            $this->assertStringContainsString('You were withdrawn from the OJT', $response['body']);
        } finally {
            db()->execute_query("UPDATE interns SET status = 'PENDING' WHERE internid = 300");
        }
    }
}
