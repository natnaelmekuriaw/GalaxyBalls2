import { Children } from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';

import { useLanguage } from '@/shared/i18n/LanguageProvider';

/** Use the bundled Ethiopic faces for Amharic on Android, iOS, and web. */
export function GameText({ style, ...props }: TextProps) {
  const { language, fontsLoaded } = useLanguage();
  const weight = StyleSheet.flatten(style)?.fontWeight;
  const bold = weight === 'bold' || Number(weight) >= 600;
  const hasEthiopic = Children.toArray(props.children).some(
    (child) => typeof child === 'string' && /[\u1200-\u137f]/.test(child),
  );
  return (
    <NativeText
      {...props}
      style={[
        style,
        (language === 'am' || hasEthiopic) && fontsLoaded && {
          fontFamily: bold ? 'NotoSansEthiopicBold' : 'NotoSansEthiopic',
          fontWeight: 'normal',
          letterSpacing: 0,
        },
      ]}
    />
  );
}
