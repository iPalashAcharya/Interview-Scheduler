USE interview_sync;

CREATE TABLE job_opening(
	id INT AUTO_INCREMENT PRIMARY KEY,
	title VARCHAR(255),
	description TEXT,
	requirements TEXT,
	domain_id INT NOT NULL,
	required_exp_years INT DEFAULT 0,
	min_cgpa DECIMAL(3,2),
	location VARCHAR(255),
	employment_type ENUM('full-time','part-time','contract','internship') DEFAULT 'full-time',
	status ENUM('draft','open','paused','closed') DEFAULT 'draft',
	application_deadline DATE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (domain_id) REFERENCES domain(id),
	INDEX idx_status (status),
	INDEX idx_domain (domain_id),
	INDEX idx_deadline (application_deadline)
);

CREATE TABLE users(
	id INT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(255) NOT NULL ,
	email VARCHAR(255) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	is_active BOOLEAN DEFAULT TRUE,
	role ENUM('Interviewer','HR','Candidate'),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	INDEX is_active (is_active)
);

CREATE TABLE candidate(
	id INT PRIMARY KEY,
	linkedin_url VARCHAR(255),
	resume_url VARCHAR(255),
	github_url VARCHAR(255),
	skills TEXT,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE application(
	id INT AUTO_INCREMENT PRIMARY KEY,
	candidate_id INT NOT NULL,
	application_number VARCHAR(100) NOT NULL UNIQUE,
	job_id INT NOT NULL,
	import_batch_id INT NULL,
	name VARCHAR(255),
	email VARCHAR(255),
	phone VARCHAR(20),
	experience_years INT NOT NULL,
	applied_domain_id INT NOT NULL,
	stage_id INT NOT NULL,
	current_location VARCHAR(255),
	status ENUM('submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interviewed', 'selected', 'rejected', 'withdrawn') DEFAULT 'submitted',
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (candidate_id) REFERENCES candidate(id) ON DELETE CASCADE,
	FOREIGN KEY (applied_domain_id) REFERENCES domain(id),
	FOREIGN KEY (stage_id) REFERENCES interview_round(id),
	FOREIGN KEY (job_id) REFERENCES job_opening(id) ON DELETE CASCADE,
	FOREIGN KEY (import_batch_id) REFERENCES import_batch(id),
	UNIQUE KEY unique_candidate_job (candidate_id, job_id),
	INDEX idx_candidate_id (candidate_id),
    INDEX idx_job_id (job_id),
    INDEX idx_status (status),
    INDEX idx_stage (stage_id)
);

CREATE TABLE import_batch(
	id INT AUTO_INCREMENT PRIMARY KEY,
	batch_name VARCHAR(255) NOT NULL,
	file_name VARCHAR(255),
	total_records INT DEFAULT 0,
	failed_records INT DEFAULT 0,
	status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
	completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	created_by INT NOT NULL,
	FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE interview_mapping(
	id INT AUTO_INCREMENT PRIMARY KEY,
	application_id INT NOT NULL,
	interviewer_id INT NOT NULL,
	slot_id INT NOT NULL,
	round_id INT NOT NULL,
	interview_type ENUM('Video','Phone','In-Person'),
	status ENUM('scheduled', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show') DEFAULT 'scheduled',
	location VARCHAR(255),
	meeting_link VARCHAR(500),
	candidate_confirmed BOOLEAN DEFAULT FALSE,
	interviewer_confirmed BOOLEAN DEFAULT FALSE,
	reschedule_count INT DEFAULT 0,
	reschedule_reason TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE,
	FOREIGN KEY (interviewer_id) REFERENCES interviewer(id) ON DELETE CASCADE,
	FOREIGN KEY (slot_id) REFERENCES time_slot(id),
	FOREIGN KEY (round_id) REFERENCES interview_round(id),
	INDEX idx_status (status),
	INDEX idx_interviewer_id (interviewer_id)
);

CREATE TABLE interviewer_domain(
	id INT AUTO_INCREMENT PRIMARY KEY,
	interviewer_id INT NOT NULL,
	domain_id INT,
	proficiency_level ENUM('beginner','intermediate','advanced','expert') DEFAULT 'intermediate',
	FOREIGN KEY (interviewer_id) REFERENCES interviewer(id) ON DELETE CASCADE,
	FOREIGN KEY (domain_id) REFERENCES domain(id) ON DELETE SET NULL
);

CREATE TABLE interviewer(
	id INT PRIMARY KEY,
	name VARCHAR(255),
	phone VARCHAR(20),
	FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE time_slot(
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	slot_start DATETIME NOT NULL,
	slot_end DATETIME NOT NULL,
	is_booked BOOLEAN DEFAULT FALSE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	INDEX idx_booked (is_booked),
	INDEX idx_interviewer_date (user_id,slot_start)
);

CREATE TABLE domain(
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE feedback(
	id INT AUTO_INCREMENT PRIMARY KEY,
	mapping_id INT NOT NULL,
	feedback_by INT NOT NULL,
	comment TEXT,
	rating INT CHECK (rating>=1 AND rating<=5),
	submitted_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (mapping_id) REFERENCES interview_mapping(id) ON DELETE CASCADE,
	FOREIGN KEY (feedback_by) REFERENCES users(id),
	UNIQUE KEY unique_interview_feedback (mapping_id,feedback_by),
	INDEX idx_interviewer_id (feedback_by),
	INDEX idx_rating (rating)
);

CREATE TABLE interview_round(
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	round_order INT NOT NULL UNIQUE,
	duration_minutes INT DEFAULT 60,
	round_type ENUM('technical','hr','managerial','cultural','coding','system_design') NOT NULL
);
CREATE TABLE interviewer_round (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interviewer_id INT NOT NULL,
    round_type_id INT NOT NULL,
    FOREIGN KEY (interviewer_id) REFERENCES interviewer(id) ON DELETE CASCADE,
	FOREIGN KEY (round_type_id) REFERENCES interview_round(id),
    UNIQUE KEY unique_interviewer_round (interviewer_id, round_type_id)
);

CREATE TABLE candidate_slot_choice (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mapping_id INT NOT NULL,          -- interview_mapping row
    candidate_id INT NOT NULL,
    slot_id INT NOT NULL,
    chosen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mapping_id) REFERENCES interview_mapping(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidate(id)   ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES time_slot(id)        ON DELETE CASCADE,
    UNIQUE KEY u_candidate_round (candidate_id, mapping_id)
);

ALTER TABLE time_slot ADD COLUMN slot_status 
ENUM('free','tentative','booked') DEFAULT 'free';

CREATE TABLE interview_session(
	id INT AUTO_INCREMENT PRIMARY KEY,
	slot_id INT NOT NULL,
	mapping_id INT NOT NULL,
	session_start DATETIME,
	session_end DATETIME,
	FOREIGN KEY (slot_id) REFERENCES time_slot(id),
	FOREIGN KEY (mapping_id) REFERENCES interview_mapping(id),
	UNIQUE(mapping_id),
	UNIQUE (slot_id,session_start)
);