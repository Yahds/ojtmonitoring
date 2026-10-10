CREATE TABLE audit_log (
  id INT NOT NULL AUTO_INCREMENT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_adviser_id INT NULL,
  action VARCHAR(40) NOT NULL,
  target VARCHAR(100) NULL,
  ip VARCHAR(45) NULL,
  PRIMARY KEY (id),
  KEY audit_log_actor (actor_adviser_id, created_at)
) ENGINE=InnoDB;
