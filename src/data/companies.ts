import type { Company } from '../types';

/** 初期会社マスタ（ロゴは共通 assets のファイル名だけ） */
export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'sasaki-kensetsu',
    name: '佐々木建設',
    corpTitlePos: 'suffix',
    logoKey: 'sasakikensetu_logo.png',
    footBannerKey: 'sasakikensetu_foot_name.svg',
  },
  {
    id: 'digital-signage',
    name: 'デジタルサイネージ',
    logoKey: 'greencross_logo.png',
    footBannerKey: 'greencross_foot_name.svg',
    corpTitlePos: 'suffix',
  },
  { id: 'miyagawa-kogyo', name: '宮川興業' },
  { id: 'nara-daitetsu', name: '奈良大鉄' },
  { id: 'fujiken-nagasaki', name: 'フジケン長崎' },
  { id: 'sendai-62078', name: '仙台_62078' },
  { id: 'himeji-kensetsu', name: '姫路建設' },
  {
    id: 'oumi-hachiman',
    name: '近江八幡組',
    logoKey: 'greencross_logo.png',
    footBannerKey: 'greencross_foot_name.svg',
  },
  {
    id: 'kohji-gumi',
    name: '鴻治組',
    logoKey: 'kohji_logo.png',
    corpTitlePos: 'prefix',
  },
  {
    id: 'morishita-gumi',
    name: '森下組',
    corpTitlePos: 'prefix',
    logoKey: 'morishita_logo.png',
    footBannerKey: 'morishita_foot.png',
  },
  {
    id: 'okinawa-ds',
    name: '沖縄DS',
    logoKey: 'greencross_logo.png',
    footBannerKey: 'greencross_foot_name.svg',
  },
];
