/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.2-MariaDB, for osx10.20 (arm64)
--
-- Host: localhost    Database: interview_sync
-- ------------------------------------------------------
-- Server version	11.8.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `application`
--

DROP TABLE IF EXISTS `application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `application` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `candidate_id` int(11) NOT NULL,
  `application_number` varchar(100) NOT NULL,
  `job_id` int(11) NOT NULL,
  `import_batch_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `experience_years` int(11) NOT NULL,
  `applied_domain_id` int(11) NOT NULL,
  `stage_id` int(11) NOT NULL,
  `current_location` varchar(255) DEFAULT NULL,
  `status` enum('submitted','under_review','shortlisted','interview_scheduled','interviewed','selected','rejected','withdrawn') DEFAULT 'submitted',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `skills` text DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `application_number` (`application_number`),
  UNIQUE KEY `unique_candidate_job` (`candidate_id`,`job_id`),
  KEY `applied_domain_id` (`applied_domain_id`),
  KEY `import_batch_id` (`import_batch_id`),
  KEY `idx_candidate_id` (`candidate_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_status` (`status`),
  KEY `idx_stage` (`stage_id`),
  CONSTRAINT `application_ibfk_1` FOREIGN KEY (`candidate_id`) REFERENCES `candidate` (`id`) ON DELETE CASCADE,
  CONSTRAINT `application_ibfk_2` FOREIGN KEY (`applied_domain_id`) REFERENCES `domain` (`id`),
  CONSTRAINT `application_ibfk_3` FOREIGN KEY (`stage_id`) REFERENCES `interview_round` (`id`),
  CONSTRAINT `application_ibfk_4` FOREIGN KEY (`job_id`) REFERENCES `job_opening` (`id`) ON DELETE CASCADE,
  CONSTRAINT `application_ibfk_5` FOREIGN KEY (`import_batch_id`) REFERENCES `import_batch` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application`
--

LOCK TABLES `application` WRITE;
/*!40000 ALTER TABLE `application` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `application` VALUES
(3,3,'APP001',1,NULL,'Dev Patel','dev@example.com','9991112222',2,1,1,'Mumbai','shortlisted','2025-07-23 13:08:37',NULL,'2025-07-23 13:08:37'),
(4,4,'APP002',1,NULL,'Mira Shah','mira@example.com','8889993333',3,1,1,'Bangalore','shortlisted','2025-07-23 13:08:37',NULL,'2025-07-23 13:08:37');
/*!40000 ALTER TABLE `application` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `candidate`
--

DROP TABLE IF EXISTS `candidate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate` (
  `id` int(11) NOT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL,
  `resume_url` varchar(255) DEFAULT NULL,
  `github_url` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  CONSTRAINT `candidate_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate`
--

LOCK TABLES `candidate` WRITE;
/*!40000 ALTER TABLE `candidate` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `candidate` VALUES
(3,'linkedin.com/in/dev','res1.pdf','github.com/dev','2025-07-23 10:33:23'),
(4,'linkedin.com/in/mira','res2.pdf','github.com/mira','2025-07-23 10:33:23');
/*!40000 ALTER TABLE `candidate` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `candidate_slot_choice`
--

DROP TABLE IF EXISTS `candidate_slot_choice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_slot_choice` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mapping_id` int(11) NOT NULL,
  `candidate_id` int(11) NOT NULL,
  `slot_id` int(11) NOT NULL,
  `session_start` datetime NOT NULL,
  `session_end` datetime NOT NULL,
  `chosen_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `u_candidate_round` (`candidate_id`,`mapping_id`),
  KEY `mapping_id` (`mapping_id`),
  KEY `slot_id` (`slot_id`),
  CONSTRAINT `candidate_slot_choice_ibfk_1` FOREIGN KEY (`mapping_id`) REFERENCES `interview_mapping` (`id`) ON DELETE CASCADE,
  CONSTRAINT `candidate_slot_choice_ibfk_2` FOREIGN KEY (`candidate_id`) REFERENCES `candidate` (`id`) ON DELETE CASCADE,
  CONSTRAINT `candidate_slot_choice_ibfk_3` FOREIGN KEY (`slot_id`) REFERENCES `time_slot` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_slot_choice`
--

LOCK TABLES `candidate_slot_choice` WRITE;
/*!40000 ALTER TABLE `candidate_slot_choice` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `candidate_slot_choice` VALUES
(1,2,3,10,'2025-07-24 10:00:00','2025-07-24 10:30:00','2025-07-23 10:55:56');
/*!40000 ALTER TABLE `candidate_slot_choice` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `domain`
--

DROP TABLE IF EXISTS `domain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `domain` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `domain`
--

LOCK TABLES `domain` WRITE;
/*!40000 ALTER TABLE `domain` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `domain` VALUES
(1,'Backend'),
(2,'Frontend');
/*!40000 ALTER TABLE `domain` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mapping_id` int(11) NOT NULL,
  `feedback_by` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `submitted_on` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_interview_feedback` (`mapping_id`,`feedback_by`),
  KEY `idx_interviewer_id` (`feedback_by`),
  KEY `idx_rating` (`rating`),
  CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`mapping_id`) REFERENCES `interview_mapping` (`id`) ON DELETE CASCADE,
  CONSTRAINT `feedback_ibfk_2` FOREIGN KEY (`feedback_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `import_batch`
--

DROP TABLE IF EXISTS `import_batch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_batch` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_name` varchar(255) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `total_records` int(11) DEFAULT 0,
  `failed_records` int(11) DEFAULT 0,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `completed_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `import_batch_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_batch`
--

LOCK TABLES `import_batch` WRITE;
/*!40000 ALTER TABLE `import_batch` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `import_batch` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `interview_mapping`
--

DROP TABLE IF EXISTS `interview_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `interview_mapping` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `application_id` int(11) NOT NULL,
  `interviewer_id` int(11) NOT NULL,
  `slot_id` int(11) NOT NULL,
  `round_id` int(11) NOT NULL,
  `interview_type` enum('Video','Phone','In-Person') DEFAULT NULL,
  `status` enum('scheduled','confirmed','rescheduled','cancelled','completed','no_show') DEFAULT 'scheduled',
  `location` varchar(255) DEFAULT NULL,
  `meeting_link` varchar(500) DEFAULT NULL,
  `candidate_confirmed` tinyint(1) DEFAULT 0,
  `interviewer_confirmed` tinyint(1) DEFAULT 0,
  `reschedule_count` int(11) DEFAULT 0,
  `reschedule_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `slot_id` (`slot_id`),
  KEY `round_id` (`round_id`),
  KEY `idx_status` (`status`),
  KEY `idx_interviewer_id` (`interviewer_id`),
  CONSTRAINT `interview_mapping_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `application` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_mapping_ibfk_2` FOREIGN KEY (`interviewer_id`) REFERENCES `interviewer` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interview_mapping_ibfk_3` FOREIGN KEY (`slot_id`) REFERENCES `time_slot` (`id`),
  CONSTRAINT `interview_mapping_ibfk_4` FOREIGN KEY (`round_id`) REFERENCES `interview_round` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interview_mapping`
--

LOCK TABLES `interview_mapping` WRITE;
/*!40000 ALTER TABLE `interview_mapping` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `interview_mapping` VALUES
(2,3,1,10,1,NULL,'confirmed',NULL,NULL,1,0,0,NULL,'2025-07-23 10:44:49','2025-07-23 10:55:56'),
(3,4,1,11,1,NULL,'scheduled',NULL,NULL,0,0,0,NULL,'2025-07-23 10:44:49','2025-07-23 10:44:49');
/*!40000 ALTER TABLE `interview_mapping` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `interview_round`
--

DROP TABLE IF EXISTS `interview_round`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `interview_round` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `round_order` int(11) NOT NULL,
  `duration_minutes` int(11) DEFAULT 60,
  `round_type` enum('technical','hr','managerial','cultural','coding','system_design') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `round_order` (`round_order`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interview_round`
--

LOCK TABLES `interview_round` WRITE;
/*!40000 ALTER TABLE `interview_round` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `interview_round` VALUES
(1,'Tech Round','Technical assessment',1,30,'technical'),
(2,'HR Round','HR interview',2,20,'hr');
/*!40000 ALTER TABLE `interview_round` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `interview_session`
--

DROP TABLE IF EXISTS `interview_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `interview_session` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slot_id` int(11) NOT NULL,
  `mapping_id` int(11) NOT NULL,
  `session_start` datetime DEFAULT NULL,
  `session_end` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mapping_id` (`mapping_id`),
  UNIQUE KEY `slot_id` (`slot_id`,`session_start`),
  CONSTRAINT `fk_session_mapping` FOREIGN KEY (`mapping_id`) REFERENCES `interview_mapping` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_session_slot` FOREIGN KEY (`slot_id`) REFERENCES `time_slot` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interview_session`
--

LOCK TABLES `interview_session` WRITE;
/*!40000 ALTER TABLE `interview_session` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `interview_session` VALUES
(1,10,2,'2025-07-24 10:00:00','2025-07-24 10:30:00'),
(2,11,3,'2025-07-24 11:00:00','2025-07-24 11:30:00');
/*!40000 ALTER TABLE `interview_session` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `interviewer`
--

DROP TABLE IF EXISTS `interviewer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `interviewer` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `interviewer_ibfk_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interviewer`
--

LOCK TABLES `interviewer` WRITE;
/*!40000 ALTER TABLE `interviewer` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `interviewer` VALUES
(1,'John Smith','1234567890'),
(2,'Alice Johnson','9876543210');
/*!40000 ALTER TABLE `interviewer` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `interviewer_domain`
--

DROP TABLE IF EXISTS `interviewer_domain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `interviewer_domain` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `interviewer_id` int(11) NOT NULL,
  `domain_id` int(11) DEFAULT NULL,
  `proficiency_level` enum('beginner','intermediate','advanced','expert') DEFAULT 'intermediate',
  PRIMARY KEY (`id`),
  KEY `interviewer_id` (`interviewer_id`),
  KEY `domain_id` (`domain_id`),
  CONSTRAINT `interviewer_domain_ibfk_1` FOREIGN KEY (`interviewer_id`) REFERENCES `interviewer` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interviewer_domain_ibfk_2` FOREIGN KEY (`domain_id`) REFERENCES `domain` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interviewer_domain`
--

LOCK TABLES `interviewer_domain` WRITE;
/*!40000 ALTER TABLE `interviewer_domain` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `interviewer_domain` VALUES
(4,1,1,'expert'),
(5,2,1,'advanced');
/*!40000 ALTER TABLE `interviewer_domain` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `interviewer_round`
--

DROP TABLE IF EXISTS `interviewer_round`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `interviewer_round` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `interviewer_id` int(11) NOT NULL,
  `round_type_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_interviewer_round` (`interviewer_id`,`round_type_id`),
  KEY `round_type_id` (`round_type_id`),
  CONSTRAINT `interviewer_round_ibfk_1` FOREIGN KEY (`interviewer_id`) REFERENCES `interviewer` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interviewer_round_ibfk_2` FOREIGN KEY (`round_type_id`) REFERENCES `interview_round` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interviewer_round`
--

LOCK TABLES `interviewer_round` WRITE;
/*!40000 ALTER TABLE `interviewer_round` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `interviewer_round` VALUES
(7,1,1),
(8,2,1);
/*!40000 ALTER TABLE `interviewer_round` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `job_opening`
--

DROP TABLE IF EXISTS `job_opening`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_opening` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `requirements` text DEFAULT NULL,
  `domain_id` int(11) NOT NULL,
  `required_exp_years` int(11) DEFAULT 0,
  `min_cgpa` decimal(3,2) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `employment_type` enum('full-time','part-time','contract','internship') DEFAULT 'full-time',
  `status` enum('draft','open','paused','closed') DEFAULT 'draft',
  `application_deadline` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_domain` (`domain_id`),
  KEY `idx_deadline` (`application_deadline`),
  CONSTRAINT `job_opening_ibfk_1` FOREIGN KEY (`domain_id`) REFERENCES `domain` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_opening`
--

LOCK TABLES `job_opening` WRITE;
/*!40000 ALTER TABLE `job_opening` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `job_opening` VALUES
(1,'Backend Developer','Develop server-side APIs',NULL,1,0,NULL,NULL,'full-time','open','2025-12-31','2025-07-23 10:38:24','2025-07-23 10:38:24');
/*!40000 ALTER TABLE `job_opening` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `time_slot`
--

DROP TABLE IF EXISTS `time_slot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `time_slot` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `slot_start` datetime NOT NULL,
  `slot_end` datetime NOT NULL,
  `is_booked` tinyint(1) DEFAULT 0,
  `slot_status` enum('free','tentative','booked') DEFAULT 'free',
  PRIMARY KEY (`id`),
  KEY `idx_booked` (`is_booked`),
  KEY `idx_interviewer_date` (`user_id`,`slot_start`),
  CONSTRAINT `time_slot_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_slot`
--

LOCK TABLES `time_slot` WRITE;
/*!40000 ALTER TABLE `time_slot` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `time_slot` VALUES
(10,1,'2025-07-24 10:00:00','2025-07-24 11:00:00',0,'booked'),
(11,1,'2025-07-24 11:00:00','2025-07-24 12:00:00',0,'tentative'),
(12,2,'2025-07-24 14:00:00','2025-07-24 15:00:00',0,'free');
/*!40000 ALTER TABLE `time_slot` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `role` enum('pending','Candidate','HR','Interviewer','Admin') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `profile_icon_url` text DEFAULT NULL,
  `requested_role` enum('Candidate','HR','Interviewer','Admin') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`,`email`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,'john.interviewer','john@example.com','hash1',1,'Interviewer','2025-07-23 10:33:04','2025-07-23 10:33:04','John','Smith',NULL,NULL),
(2,'alice.interviewer','alice@example.com','hash2',1,'Interviewer','2025-07-23 10:33:04','2025-07-23 10:33:04','Alice','Johnson',NULL,NULL),
(3,'dev.candidate','dev@example.com','hash3',1,'Candidate','2025-07-23 10:33:09','2025-07-23 10:33:09','Dev','Patel',NULL,NULL),
(4,'mira.candidate','mira@example.com','hash4',1,'Candidate','2025-07-23 10:33:09','2025-07-23 10:33:09','Mira','Shah',NULL,NULL),
(6,'random@example.com','random@example.com','$2b$10$40JeWbqWV8iQApIg.PaOPO7ynnZYmxepJqJ2ZatwzF3gxh/e1LSF.',1,'Candidate','2025-07-24 05:31:54','2025-07-24 05:35:14',NULL,NULL,'/images/default_profile.png','Candidate'),
(7,'palashacharya@example.com','palashacharya@example.com','$2b$10$LSZVuS54wInF4vYzNE4gPutbfXFFvRhuXWBZZrcwMnx3eE7ltqKxW',1,'Admin','2025-07-24 05:40:18','2025-07-24 05:41:18',NULL,NULL,'/images/default_profile.png','Admin');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-07-24 15:28:15
