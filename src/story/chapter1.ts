// 主线剧情 - 剧情一：车祸与灵魂
// 图片素材目录: assets/main/主线剧情/剧情一/

import type { IntroSlide } from './types';

export const CHAPTER1_TITLE = '剧情一：车祸与灵魂';

export const CHAPTER1_SLIDES: IntroSlide[] = [
  {
    key: 'city-lights', name: '城市灯光',
    steps: [
      [
        { text: '"啊，已经八点半了，我给回家了，不然妈妈要骂我了"', x: 640, y: 350 },
      ],
      [
        { text: '"拜拜，大家也要注意路上安全哦"', x: 640, y: 350 },
      ],
    ],
  },
  {
    key: '', name: '黑屏',
    steps: [
      [
        { text: '正当我在十字路口和大家告别的时候', x: 640, y: 360 },
      ],
    ],
  },
  {
    key: 'dayun', name: '大运',
    steps: [
      [
        { text: '一量大货车向我撞来', x: 640, y: 360 },
      ],
      [
        { text: '我的报应到了啊，这是我的第一反应', x: 640, y: 360 },
      ],
      [
        { text: '校园霸凌班里不爱说话的女孩，偷窃店家的东西被发现了就嫁祸给无辜的路人，抢走闺蜜的男朋友...', x: 640, y: 360 },
      ],
      [
        { text: '无所谓了，这一切都结束了', x: 640, y: 360 },
      ],
    ],
  },
  {
    key: '__soul__', name: '灵魂',
    steps: [[]],
  },
];
