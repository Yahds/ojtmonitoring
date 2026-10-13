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

        $subjects = array_column(getAnnouncementsForIntern(self::MARIA), 'subject');
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

        $posts = array_column(getAnnouncementsForIntern(self::MARIA), 'edited', 'subject');

        $this->assertEquals(1, $posts[self::SUBJECT . ' edited']);
    }
}
