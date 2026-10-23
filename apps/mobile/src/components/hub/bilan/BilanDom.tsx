/// <reference lib="dom" />
'use dom';

// La « Carte d'identité » du Bilan, rendue EXACTEMENT comme sur le web : même gabarit HTML (bilan-html.ts du web,
// importé tel quel) et même feuille de style (DESIGN_CSS), dans un composant DOM d'Expo (rendu local dans l'app,
// aucune page distante). Les données viennent de l'app native ; chaque toucher sur une carte est renvoyé à l'app
// (fiche détaillée, explication, document, personnalisation) qui ouvre ses feuilles iOS.

import { useEffect, useRef } from 'react';
import type { DOMProps } from 'expo/dom';
import { DESIGN_CSS } from '../../../../../web/src/app/parent/(hub)/bilans/bilan-html';

export type BilanAction = { type: 'info' | 'doc' | 'href' | 'edit'; value: string };

type Props = {
  html: string;
  /** Variables CSS de l'ambiance (Nuit calme / Jour clair) : --bg, --surface, --text… */
  vars: Record<string, string>;
  /** Carte à mettre en évidence à l'arrivée (notification ?focus=…). */
  focus?: string | null;
  /** Anti-steering (Apple 3.1.1) : sans offre de programme dans l'app, les liens « Voir les forfaits » disparaissent. */
  hideUpgrade?: boolean;
  onAction: (a: BilanAction) => Promise<void>;
  /** Position de la carte visée (px depuis le haut du gabarit), pour que l'app y fasse défiler. */
  onFocusOffset?: (y: number) => Promise<void>;
  dom?: DOMProps;
};

const FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..600,100;1,9..144,400..500,100&family=Inter:wght@400;500;600;700;800&display=swap');";

const BASE = `
html,body{margin:0;padding:0;background:transparent;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent;}
*{-webkit-touch-callout:none;}
.bilan-host{--font-inter:'Inter';--font-display:'Fraunces';font-family:'Inter',system-ui,sans-serif;}
.bilan-host [data-info],.bilan-host [data-href],.bilan-host [data-doc],.bilan-host [data-action]{cursor:pointer;}
.bilan-host [data-info]:active,.bilan-host [data-href]:active,.bilan-host [data-doc]:active,.bilan-host [data-action]:active{transform:scale(.985);transition:transform .12s ease;}
@keyframes b-flashC{0%,100%{box-shadow:0 0 0 0 rgba(249,235,80,0)}30%{box-shadow:0 0 0 3px rgba(249,235,80,.55)}}
.bilan-host .b-flash{animation:b-flashC 1.6s ease 2;}
`;

export default function BilanDom({ html, vars, focus, hideUpgrade, onAction, onFocusOffset }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focus || !ref.current) return;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(`[data-info="${focus}"]`);
      if (!el) return;
      el.classList.add('b-flash');
      void onFocusOffset?.(el.getBoundingClientRect().top + window.scrollY);
    }, 350);
    return () => clearTimeout(t);
  }, [focus, html, onFocusOffset]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-action="edit-passport"]')) {
      void onAction({ type: 'edit', value: 'passport' });
      return;
    }
    const doc = target.closest('[data-doc]')?.getAttribute('data-doc');
    if (doc) {
      void onAction({ type: 'doc', value: doc });
      return;
    }
    const href = target.closest('[data-href]')?.getAttribute('data-href');
    if (href) {
      void onAction({ type: 'href', value: href });
      return;
    }
    const info = target.closest('[data-info]')?.getAttribute('data-info');
    if (info) void onAction({ type: 'info', value: info });
  };

  return (
    <div className="bilan-host" style={vars as React.CSSProperties}>
      <style
        dangerouslySetInnerHTML={{ __html: FONTS + BASE + DESIGN_CSS + (hideUpgrade ? '.bilan-host [data-href="/parent/upgrade"]{display:none!important}' : '') }}
      />
      <div ref={ref} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
