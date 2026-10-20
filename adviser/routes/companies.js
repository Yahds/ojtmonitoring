const express = require('express');
const { fetchCompanies, fetchCompany, companyNameTaken, addCompany, updateCompany } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');

const router = express.Router();

function showForm(res, status, company, values, errors) {
    res.status(status).render('pages/company-form', {
        title: company ? `Edit ${company.companyname}` : 'Add company', company, values, errors,
    });
}

function readForm(body) {
    const text = name => (typeof body[name] === 'string' ? body[name].trim() : '');
    return { name: text('name'), address: text('address'), email: text('email'), moaOnFile: body.moaOnFile === 'yes' };
}

async function checkForm(values, exceptID) {
    const errors = {};
    if (values.name === '' || values.name.length > 100) {
        errors.name = 'Write the company name, up to 100 characters.';
    } else if (await companyNameTaken(values.name, exceptID)) {
        errors.name = 'This company is already on the list.';
    }
    if (values.address.length > 150) {
        errors.address = 'Keep the address up to 150 characters.';
    }
    if (values.email !== '' && (!values.email.includes('@') || values.email.length > 255)) {
        errors.email = 'Enter an email address, like hr@company.com, or leave it empty.';
    }
    return errors;
}

router.get('/companies', requireAdviser, async (req, res, next) => {
    try {
        const companies = await fetchCompanies();
        res.render('pages/companies', {
            title: 'Companies',
            partners: companies.filter(company => company.moa_on_file),
            others: companies.filter(company => !company.moa_on_file),
        });
    } catch (error) {
        next(error);
    }
});

router.get('/companies/new', requireAdviser, (req, res) => {
    showForm(res, 200, null, { name: '', address: '', email: '', moaOnFile: true }, {});
});

router.post('/companies/new', requireAdviser, async (req, res, next) => {
    const values = readForm(req.body);
    try {
        const errors = await checkForm(values, 0);
        if (Object.keys(errors).length > 0) {
            return showForm(res, 400, null, values, errors);
        }
        const companyID = await addCompany(values);
        await audit(req, 'company_added', `company ${companyID}: ${values.name}`.slice(0, 100));
        req.flash('success', `${values.name} added.`);
        res.redirect('/adviser/companies');
    } catch (error) {
        next(error);
    }
});

router.get('/companies/:companyId/edit', requireAdviser, async (req, res, next) => {
    try {
        const company = await fetchCompany(req.params.companyId);
        if (!company) {
            return next();
        }
        const values = {
            name: company.companyname,
            address: company.companyaddress || '',
            email: company.contact_email || '',
            moaOnFile: Boolean(company.moa_on_file),
        };
        showForm(res, 200, company, values, {});
    } catch (error) {
        next(error);
    }
});

router.post('/companies/:companyId/edit', requireAdviser, async (req, res, next) => {
    const values = readForm(req.body);
    try {
        const company = await fetchCompany(req.params.companyId);
        if (!company) {
            return next();
        }
        const errors = await checkForm(values, company.companyid);
        if (Object.keys(errors).length > 0) {
            return showForm(res, 400, company, values, errors);
        }
        await updateCompany(company.companyid, values);
        await audit(req, 'company_updated', `company ${company.companyid}: ${values.name}`.slice(0, 100));
        req.flash('success', `${values.name} saved.`);
        res.redirect('/adviser/companies');
    } catch (error) {
        next(error);
    }
});

module.exports = router;
