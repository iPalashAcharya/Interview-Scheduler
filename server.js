const express = require('express');
const candidateRoutes = require('./routes/candidates');
const jobOpeningRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const interviewerRoutes = require('./routes/interviewers');
const interviewRoutes = require('./routes/interviews');
const timeSlotRoutes = require('./routes/timeSlots');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/candidates', candidateRoutes);
app.use('/jobs', jobOpeningRoutes);
app.use('/applications', applicationRoutes.router);
app.use('/interviewers', interviewerRoutes);
app.use('/interviews', interviewRoutes);
app.use('/timeslots', timeSlotRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
