// warns as soon as a file over the 5 MB limit is chosen, before anything is uploaded
document.addEventListener('change', (event) => {
  const input = event.target;
  if (input.type !== 'file' || !input.files[0]) return;

  const tooBig = input.files[0].size > 5 * 1024 * 1024;
  input.setCustomValidity(tooBig ? 'This file is larger than 5 MB. Please choose a smaller file.' : '');
  input.reportValidity();
});
