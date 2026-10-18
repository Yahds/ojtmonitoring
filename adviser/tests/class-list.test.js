const { readClassList } = require('../lib/class-list');

const COURSES = ['BSCS', 'BSIT'];
const HEADER = 'student_id,name,course,year,section,email';
// the invisible character Excel puts at the start of a "CSV UTF-8" file
const EXCEL_BOM = String.fromCharCode(0xfeff);

const read = (text, options = {}) => readClassList(text, { courses: COURSES, ...options });

test('reads every student with the line they are on', () => {
    const { rows, fileError } = read(`${HEADER}\n2299101,"Reyes, Ana",bscs,4,9375,Ana@slu.edu.ph\n2299102,"Cruz, Ben",BSIT,4,9376,ben@slu.edu.ph\n`);

    expect(fileError).toBe('');
    expect(rows).toEqual([
        { line: 2, id: '2299101', name: 'Reyes, Ana', course: 'BSCS', year: '4', classcode: '9375', email: 'ana@slu.edu.ph', errors: [] },
        { line: 3, id: '2299102', name: 'Cruz, Ben', course: 'BSIT', year: '4', classcode: '9376', email: 'ben@slu.edu.ph', errors: [] },
    ]);
});

test('columns can be in any order, and Excel extras (BOM, spaces, blank lines) are fine', () => {
    const { rows } = read(`${EXCEL_BOM}email, section ,year,course,name,student_id\n\nana@slu.edu.ph,9375,4,BSCS, Reyes Ana ,2299101\n`);

    expect(rows[0]).toMatchObject({ id: '2299101', name: 'Reyes Ana', classcode: '9375', errors: [] });
});

test('each wrong field gets its own message', () => {
    const { rows } = read(`${HEADER}\nabc,,BSXX,9,,not-an-email\n`);

    expect(rows[0].errors).toEqual([
        'Student ID must be a number.',
        'Name is empty.',
        'Course must be one of: BSCS, BSIT.',
        'Year must be a number from 1 to 5.',
        'Section is empty.',
        'Email must be an email address.',
    ]);
});

test('a student ID or email that is already enrolled or in the file twice is marked', () => {
    const { rows } = read(
        `${HEADER}\n2299101,A,BSCS,4,1,a@slu.edu.ph\n2299102,B,BSCS,4,1,taken@slu.edu.ph\n2299103,C,BSCS,4,1,c@slu.edu.ph\n2299103,D,BSCS,4,1,c@slu.edu.ph\n`,
        { takenIds: new Set(['2299101']), takenEmails: new Set(['taken@slu.edu.ph']) },
    );

    expect(rows.map(row => row.errors)).toEqual([
        ['This student ID is already enrolled.'],
        ['This email is already used by another student.'],
        [],
        ['This student ID is in the file twice.', 'This email is in the file twice.'],
    ]);
});

test('a file without the right columns, without students or with too many is refused as a whole', () => {
    expect(read('id,name\n1,A\n').fileError).toMatch(/Missing: student_id, course, year, section, email/);
    expect(read(`${HEADER}\n`).fileError).toBe('The file has no students in it.');
    expect(read('').fileError).toMatch(/Missing/);

    const tooMany = [HEADER, ...Array.from({ length: 201 }, (_, i) => `${i + 1},A,BSCS,4,1,${i}@slu.edu.ph`)].join('\n');
    expect(read(tooMany).fileError).toBe('The file has 201 students. Upload at most 200 at a time.');
});

test('a file that is not a CSV is refused with a hint', () => {
    expect(read(`${HEADER}\n1,"unclosed,BSCS,4,1,a@b\n`).fileError).toMatch(/could not be read/);
});
