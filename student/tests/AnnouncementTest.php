<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../src/db/index.php';

class AnnouncementTest extends TestCase
{
    private const MARIA = 300; // adviser 1, section CS401
    private const SUBJECT = 'Announcement test';

    protected function tearDown(): void
    {
        db()->execute_query("DELETE FROM announcements WHERE subject LIKE ?", [self::SUBJECT . '%']);
    }

    private function post(int $adviserID, ?string $section, string $label, ?string $filePath = null): int
    {
        db()->execute_query(
            "INSERT INTO announcements (senderid, audience_classcode, subject, message, file_path) VALUES (?, ?, ?, 'test', ?)",
            [$adviserID, $section, self::SUBJECT . " $label", $filePath]
        );
        return db()->insert_id;
    }

    public function testInternSeesPostsToAllAndToTheirOwnSectionOnly(): void
    {
        $this->post(1, null, 'to all');
        $this->post(1, 'CS401', 'to my section');
        $this->post(1, 'IT401', 'to another section');
        $this->post(2, null, 'from another adviser');

        $subjects = array_column(findAnnouncementsForIntern(self::MARIA)['announcements'], 'subject');
        $mine = array_values(array_filter($subjects, fn ($subject) => str_starts_with($subject, self::SUBJECT)));

        $this->assertSame([self::SUBJECT . ' to my section', self::SUBJECT . ' to all'], $mine);
    }

    public function testInternCanOnlyGetFilesFromPostsTheyCanSee(): void
    {
        $mine = $this->post(1, 'CS401', 'mine', 'announcement_mine.pdf');
        $otherSection = $this->post(1, 'IT401', 'other section', 'announcement_other.pdf');
        $otherAdviser = $this->post(2, null, 'other adviser', 'announcement_adviser2.pdf');

        $this->assertSame('announcement_mine.pdf', getAnnouncementFileForIntern(self::MARIA, $mine));
        $this->assertNull(getAnnouncementFileForIntern(self::MARIA, $otherSection));
        $this->assertNull(getAnnouncementFileForIntern(self::MARIA, $otherAdviser));
    }

    public function testAnEditedPostIsMarkedEdited(): void
    {
        $this->post(1, null, 'edited');
        db()->execute_query("UPDATE announcements SET updated_at = NOW() WHERE subject = ?", [self::SUBJECT . ' edited']);

        $posts = array_column(findAnnouncementsForIntern(self::MARIA)['announcements'], 'edited', 'subject');

        $this->assertEquals(1, $posts[self::SUBJECT . ' edited']);
    }

    public function testSearchTreatsPercentAsPlainText(): void
    {
        $this->post(1, null, 'search 100% done');
        $this->post(1, null, 'search 1000 forms');

        $found = findAnnouncementsForIntern(self::MARIA, self::SUBJECT . ' search 100%');

        $this->assertSame(1, $found['total']);
        $this->assertSame(self::SUBJECT . ' search 100% done', $found['announcements'][0]['subject']);
    }

    public function testPostsComeTenPerPage(): void
    {
        for ($i = 1; $i <= 11; $i++) {
            $this->post(1, null, "paged $i");
        }

        $first = findAnnouncementsForIntern(self::MARIA, self::SUBJECT . ' paged');
        $second = findAnnouncementsForIntern(self::MARIA, self::SUBJECT . ' paged', 2);
        $pastTheEnd = findAnnouncementsForIntern(self::MARIA, self::SUBJECT . ' paged', 99);

        $this->assertCount(10, $first['announcements']);
        $this->assertSame(2, $first['pages']);
        $this->assertCount(1, $second['announcements']);
        $this->assertSame(2, $pastTheEnd['page']);
    }
}
