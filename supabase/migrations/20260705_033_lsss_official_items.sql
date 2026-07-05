-- 033 : remplacement des gabarits par les 43 items officiels du LSSS
-- (Life Skills Scale for Sport, Cronin & Allen 2017 ; source : thèse
-- « Positive Youth Development Through Sport », Annexe B). Répartition
-- officielle : Teamwork 7, Goal setting 7, Social skills 5, Problem solving 4,
-- Emotional skills 4, Leadership 8, Time management 4, Communication 4 = 43.
-- Aucune soumission LSSS existante → suppression + réinsertion sûres.

delete from public.lsss_items;

insert into public.lsss_items (item_number, subscale, subscale_label, local_number, prompt, lang, is_active, sort_order) values
  (1,'teamwork','Travailler en équipe',1,'Le sport m''a appris à bien travailler au sein d''une équipe / d''un groupe.','fr',true,1),
  (2,'teamwork','Travailler en équipe',2,'Le sport m''a appris à aider un coéquipier à accomplir une tâche.','fr',true,2),
  (3,'teamwork','Travailler en équipe',3,'Le sport m''a appris à accepter les suggestions d''amélioration des autres.','fr',true,3),
  (4,'teamwork','Travailler en équipe',4,'Le sport m''a appris à travailler avec les autres pour le bien de l''équipe / du groupe.','fr',true,4),
  (5,'teamwork','Travailler en équipe',5,'Le sport m''a appris à contribuer à créer un bon esprit d''équipe / de groupe.','fr',true,5),
  (6,'teamwork','Travailler en équipe',6,'Le sport m''a appris à suggérer à mes coéquipiers comment améliorer leur performance.','fr',true,6),
  (7,'teamwork','Travailler en équipe',7,'Le sport m''a appris à adapter ma façon de jouer pour le bien de l''équipe / du groupe.','fr',true,7),
  (8,'goal_setting','Fixer des objectifs',1,'Le sport m''a appris à me fixer des objectifs pour rester concentré sur ma progression.','fr',true,8),
  (9,'goal_setting','Fixer des objectifs',2,'Le sport m''a appris à me fixer des objectifs ambitieux.','fr',true,9),
  (10,'goal_setting','Fixer des objectifs',3,'Le sport m''a appris à suivre mes progrès vers mes objectifs.','fr',true,10),
  (11,'goal_setting','Fixer des objectifs',4,'Le sport m''a appris à me fixer des objectifs à court terme pour atteindre des objectifs à long terme.','fr',true,11),
  (12,'goal_setting','Fixer des objectifs',5,'Le sport m''a appris à rester engagé envers mes objectifs.','fr',true,12),
  (13,'goal_setting','Fixer des objectifs',6,'Le sport m''a appris à me fixer des objectifs pour l''entraînement.','fr',true,13),
  (14,'goal_setting','Fixer des objectifs',7,'Le sport m''a appris à me fixer des objectifs précis.','fr',true,14),
  (15,'social_skills','Créer des liens',1,'Le sport m''a appris à démarrer une conversation.','fr',true,15),
  (16,'social_skills','Créer des liens',2,'Le sport m''a appris à interagir dans différentes situations sociales.','fr',true,16),
  (17,'social_skills','Créer des liens',3,'Le sport m''a appris à aider les autres sans qu''ils aient à le demander.','fr',true,17),
  (18,'social_skills','Créer des liens',4,'Le sport m''a appris à m''impliquer dans des activités de groupe.','fr',true,18),
  (19,'social_skills','Créer des liens',5,'Le sport m''a appris à entretenir des amitiés proches.','fr',true,19),
  (20,'problem_solving','Résoudre des problèmes',1,'Le sport m''a appris à réfléchir attentivement à un problème.','fr',true,20),
  (21,'problem_solving','Résoudre des problèmes',2,'Le sport m''a appris à comparer chaque solution possible pour trouver la meilleure.','fr',true,21),
  (22,'problem_solving','Résoudre des problèmes',3,'Le sport m''a appris à imaginer le plus de solutions possibles à un problème.','fr',true,22),
  (23,'problem_solving','Résoudre des problèmes',4,'Le sport m''a appris à évaluer une solution à un problème.','fr',true,23),
  (24,'emotional_skills','Gérer ses émotions',1,'Le sport m''a appris à savoir gérer mes émotions.','fr',true,24),
  (25,'emotional_skills','Gérer ses émotions',2,'Le sport m''a appris à utiliser mes émotions pour rester concentré.','fr',true,25),
  (26,'emotional_skills','Gérer ses émotions',3,'Le sport m''a appris à comprendre que je me comporte différemment quand je suis émotif.','fr',true,26),
  (27,'emotional_skills','Gérer ses émotions',4,'Le sport m''a appris à remarquer ce que je ressens.','fr',true,27),
  (28,'leadership','Prendre le leadership',1,'Le sport m''a appris à savoir influencer positivement un groupe de personnes.','fr',true,28),
  (29,'leadership','Prendre le leadership',2,'Le sport m''a appris à organiser les membres de l''équipe / du groupe pour qu''ils travaillent ensemble.','fr',true,29),
  (30,'leadership','Prendre le leadership',3,'Le sport m''a appris à savoir motiver les autres.','fr',true,30),
  (31,'leadership','Prendre le leadership',4,'Le sport m''a appris à aider les autres à résoudre leurs problèmes de performance.','fr',true,31),
  (32,'leadership','Prendre le leadership',5,'Le sport m''a appris à tenir compte de l''opinion de chaque membre de l''équipe / du groupe.','fr',true,32),
  (33,'leadership','Prendre le leadership',6,'Le sport m''a appris à être un bon modèle pour les autres.','fr',true,33),
  (34,'leadership','Prendre le leadership',7,'Le sport m''a appris à fixer des standards élevés pour l''équipe / le groupe.','fr',true,34),
  (35,'leadership','Prendre le leadership',8,'Le sport m''a appris à reconnaître les réussites des autres.','fr',true,35),
  (36,'time_management','Gérer son temps',1,'Le sport m''a appris à bien gérer mon temps.','fr',true,36),
  (37,'time_management','Gérer son temps',2,'Le sport m''a appris à évaluer le temps que je consacre à mes différentes activités.','fr',true,37),
  (38,'time_management','Gérer son temps',3,'Le sport m''a appris à contrôler la façon dont j''utilise mon temps.','fr',true,38),
  (39,'time_management','Gérer son temps',4,'Le sport m''a appris à me fixer des objectifs pour utiliser mon temps efficacement.','fr',true,39),
  (40,'communication','Communiquer',1,'Le sport m''a appris à parler clairement aux autres.','fr',true,40),
  (41,'communication','Communiquer',2,'Le sport m''a appris à être attentif à ce que quelqu''un dit.','fr',true,41),
  (42,'communication','Communiquer',3,'Le sport m''a appris à être attentif au langage corporel des autres.','fr',true,42),
  (43,'communication','Communiquer',4,'Le sport m''a appris à bien communiquer avec les autres.','fr',true,43);
