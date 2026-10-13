document.querySelectorAll('[data-select-all]').forEach(box => {
    box.addEventListener('change', () => {
        box.form.querySelectorAll('input[name="internIds"]').forEach(item => {
            item.checked = box.checked;
        });
    });
});
