export type LocaleKey = 'en' | 'hi';
export type GenderOptionKey =
  | 'female'
  | 'male'
  | 'non-binary'
  | 'trans woman'
  | 'trans man'
  | 'genderqueer'
  | 'agender'
  | 'prefer not to say'
  | 'other';

const enMessages = {
  appTitle: 'AI Internship Recommendation Engine',
  formTitle: 'Tell us about you',
  nameLabel: 'Name',
  genderLabel: 'Gender',
  genderPlaceholder: 'Select gender',
  educationLabel: 'Education',
  educationPlaceholder: 'Select education',
  skillsLabel: 'Skills (comma separated)',
  skillsPlaceholder: 'e.g., mechanical, safety, excel basics',
  sectorLabel: 'Preferred sector',
  sectorPlaceholder: 'Select sector',
  locationHeader: 'Location',
  stateLabel: 'State',
  districtLabel: 'District',
  cityLabel: 'City',
  topK: 'Top K',
  getInternships: 'Get my internships',
  stopVoice: 'Stop voice',
  tryDemo: 'Try Priya demo',
  voiceOn: 'Voice on result',
  offline: 'Offline: showing last saved results',
  resultsCount: 'Results',
  noResults: 'No matches yet. Try different skills or sector.',
  toggleLocale: 'हिंदी में देखें',
  resultsTitle: 'Recommended Internships',
  noMatches: 'No internships match yet. Try adding more skills or adjust filters.',
  whyLabel: 'Why it matches',
  topMatchHeading: 'Top match is being read aloud.',
  loading: 'Scoring internships...',
  error: 'Could not fetch recommendations. Try again.',
  useSample: 'Try Priya demo',
  namePlaceholder: 'John Doe',
  statePlaceholder: 'Select state',
  districtPlaceholder: 'Select district',
  cityPlaceholder: 'Select city',
  search: 'Search…',
  apiError: "Couldn’t reach server. Showing offline results.",
  onlineBack: 'Back online.',
  retry: 'Retry'
} as const;

type Messages = typeof enMessages;
type MessageDictionary = { [K in keyof Messages]: string };

const hiMessages: MessageDictionary = {
  appTitle: 'एआई इंटर्नशिप सिफारिश इंजन',
  formTitle: 'अपने बारे में बताएं',
  nameLabel: 'नाम',
  genderLabel: 'लिंग',
  genderPlaceholder: 'लिंग चुनें',
  educationLabel: 'शिक्षा',
  educationPlaceholder: 'अपनी शिक्षा चुनें',
  skillsLabel: 'कौशल (कॉमा से अलग)',
  skillsPlaceholder: 'उदा., mechanical, safety, excel basics',
  sectorLabel: 'पसंदीदा क्षेत्र',
  sectorPlaceholder: 'क्षेत्र चुनें',
  locationHeader: 'स्थान',
  stateLabel: 'राज्य',
  districtLabel: 'ज़िला',
  cityLabel: 'शहर',
  topK: 'टॉप K',
  getInternships: 'मेरी इंटर्नशिप दिखाएं',
  stopVoice: 'आवाज़ रोकें',
  tryDemo: 'प्रिया डेमो आज़माएँ',
  voiceOn: 'परिणाम पर आवाज़',
  offline: 'ऑफ़लाइन: पिछला सहेजा हुआ परिणाम दिख रहा है',
  resultsCount: 'परिणाम',
  noResults: 'कोई मेल नहीं मिला। कौशल या क्षेत्र बदलकर देखें।',
  toggleLocale: 'View in English',
  resultsTitle: 'अनुशंसित इंटर्नशिप',
  noMatches: 'अभी कोई मेल नहीं मिला। कौशल जोड़ें या विकल्प बदलें।',
  whyLabel: 'मेल खाने के कारण',
  topMatchHeading: 'शीर्ष मेल को ज़ोर से पढ़ा जा रहा है।',
  loading: 'इंटर्नशिप का मूल्यांकन हो रहा है...',
  error: 'सिफारिशें नहीं मिलीं, दोबारा प्रयास करें।',
  useSample: 'प्रीया डेमो भरें',
  namePlaceholder: 'अशोक कुमार',
  statePlaceholder: 'राज्य चुनें',
  districtPlaceholder: 'ज़िला चुनें',
  cityPlaceholder: 'शहर चुनें',
  search: 'खोजें…',
  apiError: 'सर्वर से संपर्क नहीं हो पाया। ऑफ़लाइन परिणाम दिखाए जा रहे हैं।',
  onlineBack: 'कनेक्शन बहाल।',
  retry: 'दोबारा कोशिश करें'
};

export const strings: Record<LocaleKey, MessageDictionary> = {
  en: enMessages,
  hi: hiMessages
};

export type MessageKey = keyof Messages;

export const t = (locale: LocaleKey, key: MessageKey): string => {
  return strings[locale][key] ?? strings.en[key];
};

type GenderOptionsMap = Record<GenderOptionKey, string>;

export const genderOptionsMap: Record<LocaleKey, GenderOptionsMap> = {
  en: {
    female: 'female',
    male: 'male',
    'non-binary': 'non-binary',
    'trans woman': 'trans woman',
    'trans man': 'trans man',
    genderqueer: 'genderqueer',
    agender: 'agender',
    'prefer not to say': 'prefer not to say',
    other: 'other'
  },
  hi: {
    female: 'महिला',
    male: 'पुरुष',
    'non-binary': 'नॉन-बाइनरी',
    'trans woman': 'ट्रांस महिला',
    'trans man': 'ट्रांस पुरुष',
    genderqueer: 'जेंडरक्वियर',
    agender: 'एजेंडर',
    'prefer not to say': 'न बताना पसंद करेंगे',
    other: 'अन्य'
  }
};

type STRLocale = MessageDictionary & { genderOptions: GenderOptionsMap };

export const STR: Record<LocaleKey, STRLocale> = {
  en: { ...enMessages, genderOptions: genderOptionsMap.en },
  hi: { ...hiMessages, genderOptions: genderOptionsMap.hi }
};
