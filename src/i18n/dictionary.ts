export type Language = 'fr' | 'en';

export const translations = {
  fr: {
    // Child UI Columns
    'col.todo': 'À faire 🟡',
    'col.doing': 'En cours 🟠',
    'col.done': 'Terminé ! 🟢',

    // Core buttons
    'btn.parent_mode': 'Mode Parent',
    'btn.exit_parent': 'Quitter le Mode Parent',
    'btn.close': 'Fermer',
    'btn.save': 'Sauvegarder',
    'btn.delete': 'Supprimer',
    'btn.add': 'Ajouter',
    'btn.cancel': 'Annuler',
    'btn.reset': 'Réinitialiser la Routine',
    'btn.select_child': 'Choisir un enfant',

    // Routine seed tasks
    'task.toys': 'Ranger ses jouets',
    'task.pajamas': 'Mettre son pyjama',
    'task.teeth': 'Se brosser les dents',
    'task.toilet': 'Aller aux toilettes',
    'task.choose_story': 'Choisir son histoire',
    'task.read_story': 'Lire l\'histoire',
    'task.cuddle': 'Câlins et calme',
    'task.lights_off': 'Éteindre la lumière',

    // Parent PIN pad
    'pin.title': 'Accès Parent',
    'pin.instruction': 'Saisir le code ou maintenir le bouton rouage 3 secondes',
    'pin.error': 'Code incorrect !',
    'pin.clear': 'Effacer',

    // Parent Mode Navigation
    'parent.title': 'Tableau de bord Parent',
    'parent.tab.tasks': 'Routine & Tâches',
    'parent.tab.children': 'Enfants',
    'parent.tab.history': 'Historique',
    'parent.tab.settings': 'Paramètres',

    // Parent - Tasks Manager
    'parent.tasks.title': 'Gérer les tâches de la routine',
    'parent.tasks.add': 'Ajouter une tâche',
    'parent.tasks.icon_placeholder': 'Emoji (ex: 🦊, 🌙)',
    'parent.tasks.label_placeholder': 'Nom de la tâche (ex: Boire de l\'eau)',
    'parent.tasks.order': 'Ordre',

    // Parent - Children Manager
    'parent.children.title': 'Gérer les profils enfants',
    'parent.children.add': 'Ajouter un enfant',
    'parent.children.name_placeholder': 'Prénom',
    'parent.children.avatar_placeholder': 'Avatar Emoji (ex: 🐼, 🦁)',
    'parent.children.age': 'Âge (optionnel)',
    'parent.children.theme': 'Couleur thème',
    'parent.children.stars': 'Étoiles',

    // Parent - History Panel
    'parent.history.title': 'Historique des routines',
    'parent.history.empty': 'Aucun historique enregistré pour le moment.',
    'parent.history.completed': 'Routine terminée !',
    'parent.history.incomplete': 'En cours...',
    'parent.history.tasks_completed': 'tâches faites',

    // Parent - Settings Panel
    'parent.settings.title': 'Paramètres de l\'application',
    'parent.settings.pin_label': 'Code PIN Parent',
    'parent.settings.language': 'Langue',
    'parent.settings.stars_per_completion': 'Étoiles par routine finie',
    'parent.settings.weekly_goal': 'Objectif hebdomadaire (étoiles)',
    'parent.settings.reset_all_db': 'Réinitialiser toutes les données',
    'parent.settings.reset_db_confirm': 'Êtes-vous sûr ? Cela supprimera TOUTES les données (tâches, profils, historique).',

    // Rewards & Celebrations
    'reward.congratulations': 'Félicitations ! 🌟',
    'reward.routine_finished': 'Tu as fini toute ta routine ! Bravo !',
    'reward.stars_earned': 'Tu as gagné une étoile !',
    'reward.weekly_stars': 'Étoiles de la semaine',
    'reward.goal_reached': 'Objectif de la semaine atteint ! Super champion !',
  },
  en: {
    // Child UI Columns
    'col.todo': 'To Do 🟡',
    'col.doing': 'Doing 🟠',
    'col.done': 'Done ! 🟢',

    // Core buttons
    'btn.parent_mode': 'Parent Mode',
    'btn.exit_parent': 'Exit Parent Mode',
    'btn.close': 'Close',
    'btn.save': 'Save',
    'btn.delete': 'Delete',
    'btn.add': 'Add New',
    'btn.cancel': 'Cancel',
    'btn.reset': 'Reset Routine',
    'btn.select_child': 'Choose child',

    // Routine seed tasks
    'task.toys': 'Put toys away',
    'task.pajamas': 'Put pajamas on',
    'task.teeth': 'Brush teeth',
    'task.toilet': 'Go to the toilet',
    'task.choose_story': 'Choose story',
    'task.read_story': 'Read bedtime story',
    'task.cuddle': 'Cuddle & calm time',
    'task.lights_off': 'Lights off',

    // Parent PIN pad
    'pin.title': 'Parent Access',
    'pin.instruction': 'Enter PIN or hold the gear button for 3 seconds',
    'pin.error': 'Incorrect PIN!',
    'pin.clear': 'Clear',

    // Parent Mode Navigation
    'parent.title': 'Parent Dashboard',
    'parent.tab.tasks': 'Routine & Tasks',
    'parent.tab.children': 'Children',
    'parent.tab.history': 'History',
    'parent.tab.settings': 'Settings',

    // Parent - Tasks Manager
    'parent.tasks.title': 'Manage Routine Tasks',
    'parent.tasks.add': 'Add Task',
    'parent.tasks.icon_placeholder': 'Emoji (e.g. 🦊, 🌙)',
    'parent.tasks.label_placeholder': 'Task Name (e.g. Drink water)',
    'parent.tasks.order': 'Order',

    // Parent - Children Manager
    'parent.children.title': 'Manage Child Profiles',
    'parent.children.add': 'Add Child',
    'parent.children.name_placeholder': 'First Name',
    'parent.children.avatar_placeholder': 'Avatar Emoji (e.g. 🐼, 🦁)',
    'parent.children.age': 'Age (optional)',
    'parent.children.theme': 'Theme Color',
    'parent.children.stars': 'Stars',

    // Parent - History Panel
    'parent.history.title': 'Routine History',
    'parent.history.empty': 'No routine history recorded yet.',
    'parent.history.completed': 'Routine Completed!',
    'parent.history.incomplete': 'In progress...',
    'parent.history.tasks_completed': 'tasks done',

    // Parent - Settings Panel
    'parent.settings.title': 'App Settings',
    'parent.settings.pin_label': 'Parent PIN Code',
    'parent.settings.language': 'Language',
    'parent.settings.stars_per_completion': 'Stars per completed routine',
    'parent.settings.weekly_goal': 'Weekly star goal',
    'parent.settings.reset_all_db': 'Reset All Data',
    'parent.settings.reset_db_confirm': 'Are you sure? This will delete ALL data (tasks, profiles, history).',

    // Rewards & Celebrations
    'reward.congratulations': 'Congratulations! 🌟',
    'reward.routine_finished': 'You finished your routine! Great job!',
    'reward.stars_earned': 'You earned a star!',
    'reward.weekly_stars': 'Weekly Stars',
    'reward.goal_reached': 'Weekly goal reached! You are a superstar!',
  },
};

export type TranslationKey = keyof typeof translations['fr'];

/**
 * Returns localized string for a key based on the settings language.
 */
export function translate(key: string, lang: Language): string {
  const dict: Record<string, string> = translations[lang] || translations['fr'];
  return dict[key] || key;
}
