<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/uploads.php';

class UploadTest extends TestCase
{
    private function fakeUpload(string $content, ?int $size = null): array
    {
        $path = tempnam(sys_get_temp_dir(), 'upload');
        file_put_contents($path, $content);
        return ['tmp_name' => $path, 'error' => UPLOAD_ERR_OK, 'size' => $size ?? strlen($content)];
    }

    public function testAPdfIsAccepted(): void
    {
        $this->assertNull(uploadError($this->fakeUpload("%PDF-1.4\n%test\n")));
    }

    public function testAFileIsJudgedByItsContentNotItsName(): void
    {
        $this->assertSame('This file type is not supported. Please upload a PDF, JPG, PNG, DOC or DOCX file.', uploadError($this->fakeUpload('<?php echo "hacked";')));
    }

    public function testAFileOver5MbIsRejected(): void
    {
        $this->assertSame('The file exceeds the 5 MB size limit. Please upload a smaller file.', uploadError($this->fakeUpload("%PDF-1.4\n", 6 * 1024 * 1024)));
    }

    public function testChoosingNoFileIsNotAnError(): void
    {
        $this->assertNull(uploadError(['error' => UPLOAD_ERR_NO_FILE]));
    }
}
