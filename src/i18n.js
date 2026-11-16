// UI strings. English by default, French when the browser is in French.
const STRINGS = {
  en: {
    tabToday: "Today",
    tabAvailability: "Availability",
    tabSearch: "Search",
    pickups: "Pick-ups",
    returns: "Returns",
    noPickups: "No pick-up planned today.",
    noReturns: "No return planned today.",
    from: "From",
    to: "To",
    type: "Vehicle type",
    anyType: "Any type",
    check: "Check",
    noVehicle: "No vehicle free for these dates.",
    days: "days",
    searchLabel: "Rental number or customer email",
    searchPlaceholder: "LOC-2026.11-0010 or name@example.com",
    find: "Find",
    nothingFound: "Nothing found.",
    customer: "Customer: ",
    rentalsOf: "Rentals",
    loading: "Loading…",
    needKey: "Add your Lexio API key to start.",
    openSettings: "Open settings",
    settings: "Settings",
    errorAuth: "The API key is invalid or revoked. Check it in the settings.",
    errorScope: "This key lacks a scope for this action",
    errorRate: "Too many requests. Wait a minute and try again.",
    errorNetwork: "Lexio could not be reached. Check your connection.",
    errorDates: "The return must be after the pick-up.",
    status: { PENDING_APPROVAL: "Pending", RESERVED: "Reserved", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" },
    // Options page
    optTitle: "Lexio Rent extension settings",
    optKey: "API key",
    optKeyHelp: "Create a key in Lexio under Settings › Developer › API tokens. Read scopes are enough: vehicles.read, offers.read, rentals.read, customers.read. The key starts with lck_.",
    optSave: "Save and test",
    optRemove: "Remove key",
    optSaved: "Connected to",
    optRemoved: "Key removed.",
    optPrivacy: "The key is stored only in this browser profile and is sent only to api.lexio.rent.",
  },
  fr: {
    tabToday: "Aujourd'hui",
    tabAvailability: "Disponibilités",
    tabSearch: "Recherche",
    pickups: "Départs",
    returns: "Retours",
    noPickups: "Aucun départ prévu aujourd'hui.",
    noReturns: "Aucun retour prévu aujourd'hui.",
    from: "Du",
    to: "Au",
    type: "Type de véhicule",
    anyType: "Tous les types",
    check: "Vérifier",
    noVehicle: "Aucun véhicule libre sur ces dates.",
    days: "jours",
    searchLabel: "Numéro de location ou e-mail du client",
    searchPlaceholder: "LOC-2026.11-0010 ou nom@exemple.fr",
    find: "Chercher",
    nothingFound: "Aucun résultat.",
    customer: "Client : ",
    rentalsOf: "Locations",
    loading: "Chargement…",
    needKey: "Ajoutez votre clé API Lexio pour commencer.",
    openSettings: "Ouvrir les réglages",
    settings: "Réglages",
    errorAuth: "La clé API est invalide ou révoquée. Vérifiez-la dans les réglages.",
    errorScope: "Il manque un droit (scope) à cette clé pour cette action",
    errorRate: "Trop de requêtes. Attendez une minute puis réessayez.",
    errorNetwork: "Impossible de joindre Lexio. Vérifiez votre connexion.",
    errorDates: "Le retour doit être après le départ.",
    status: { PENDING_APPROVAL: "À valider", RESERVED: "Réservée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée" },
    optTitle: "Réglages de l'extension Lexio Rent",
    optKey: "Clé API",
    optKeyHelp: "Créez une clé dans Lexio, Paramètres › Développeur › Tokens API. Les droits de lecture suffisent : vehicles.read, offers.read, rentals.read, customers.read. La clé commence par lck_.",
    optSave: "Enregistrer et tester",
    optRemove: "Supprimer la clé",
    optSaved: "Connecté à",
    optRemoved: "Clé supprimée.",
    optPrivacy: "La clé est gardée uniquement dans ce profil de navigateur et n'est envoyée qu'à api.lexio.rent.",
  },
};

export const LOCALE = (globalThis.navigator?.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
export const t = STRINGS[LOCALE];

export const VEHICLE_TYPES = [
  "CITY", "COMPACT", "CROSSOVER", "SEDAN", "BREAK", "SUV", "OFF_ROAD", "PICKUP", "MINIVAN",
  "VAN", "UTILITY", "COUPE", "CONVERTIBLE", "SPORT", "LUXURY", "MOTORCYCLE", "SCOOTER",
];

export function errorMessage(err) {
  if (!err || err.status === undefined || err.status === 0) return t.errorNetwork;
  if (err.status === 401) return t.errorAuth;
  if (err.status === 403) return `${t.errorScope}${err.detail ? ` (${err.detail})` : ""}.`;
  if (err.status === 429) return t.errorRate;
  return `${err.message}${err.requestId ? ` (requestId ${err.requestId})` : ""}`;
}
