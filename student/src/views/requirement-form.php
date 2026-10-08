<?php
// the upload form for one requirement; expects $requirement and $buttonLabel
$formId = (int) $requirement->reqID;
?>
<form class="form" action="/student/requirements" method="post" enctype="multipart/form-data">
    <?= csrf_field() ?>
    <input type="hidden" name="reqid" value="<?= $formId ?>">
    <div class="field">
        <label for="file-<?= $formId ?>">File</label>
        <input class="input" id="file-<?= $formId ?>" type="file" name="requirement_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
    </div>
    <div class="field">
        <label for="note-<?= $formId ?>">Note to your adviser <span class="muted">(optional)</span></label>
        <textarea class="input" id="note-<?= $formId ?>" name="intern_remarks" rows="2"><?= e($requirement->internRemarks) ?></textarea>
    </div>
    <div class="btn-row">
        <button class="btn btn-create btn-sm" type="submit"><?= e($buttonLabel) ?></button>
    </div>
</form>
