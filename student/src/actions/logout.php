<?php
// ends the session; needs the CSRF token so another site cannot log the intern out
verify_csrf();
session_destroy();
redirect('/login');
