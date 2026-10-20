import { STYLE_DESCRIPTIONS, STYLE_KEYS, STYLE_LABELS, type StyleKey } from '../../design/tokens';

/** Texte de bas de section (canevas, `stylePicker`). */
export const STYLE_PICKER_HINT = 'Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes.';
export const STYLE_PICKER_TITLE = 'Style de l’app';

export type StyleOption = {
  key: StyleKey;
  label: string;
  description: string;
  selected: boolean;
  /** Lu par VoiceOver sur la tuile (radio). */
  accessibilityLabel: string;
};

/** Les deux tuiles du sélecteur, dans l'ordre du canevas (Lin, Veillée), avec la valeur active marquée. */
export function styleOptions(value: StyleKey): StyleOption[] {
  return STYLE_KEYS.map((key) => ({
    key,
    label: STYLE_LABELS[key],
    description: STYLE_DESCRIPTIONS[key],
    selected: key === value,
    accessibilityLabel: `Style ${STYLE_LABELS[key]}, ${STYLE_DESCRIPTIONS[key].toLowerCase()}`,
  }));
}
