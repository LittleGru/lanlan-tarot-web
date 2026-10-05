export function validateEmptyInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) {
    throw new Error('请输入空对象');
  }
}

export function resolveDrawInput(input, spreads) {
  const allowedKeys = new Set(['spreadId', 'count', 'includeReversed']);
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      typeof input.includeReversed !== 'boolean' ||
      Object.keys(input).some(key => !allowedKeys.has(key))) {
    throw new Error('输入参数无效');
  }
  if (input.count !== undefined && ![1, 3].includes(input.count)) {
    throw new Error('旧版 count 须为 1 或 3');
  }
  if (input.spreadId !== undefined && typeof input.spreadId !== 'string') {
    throw new Error('牌阵标识无效');
  }
  const id = input.spreadId ?? (input.count === 1 ? 'daily' : input.count === 3 ? 'situation' : null);
  const spread = spreads.find(item => item.id === id);
  if (!spread || (input.count !== undefined && input.count !== spread.count)) {
    throw new Error('牌阵或抽牌数量无效');
  }
  return spread;
}

/** Tools call the feature controllers, so browser tools and clicks share one state. */
export function createTarotTools({ spreads, draw, practice, navigation }) {
  const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
  return [
    {
      name: 'list_tarot_spreads',
      title: '查看塔罗牌阵',
      description: '列出可用牌阵、张数、位置问题及阅读顺序。',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        validateEmptyInput(input);
        return { spreads };
      },
    },
    {
      name: 'draw_tarot_cards',
      title: '抽塔罗牌',
      description: '选择一个牌阵随机抽牌，更新可见牌阵并显示位置学习提示。count 为旧版单张/三张参数；更多牌阵请使用 spreadId。',
      inputSchema: {
        type: 'object',
        properties: {
          spreadId: { type: 'string', enum: spreads.map(spread => spread.id) },
          count: { type: 'integer', enum: [1, 3] },
          includeReversed: { type: 'boolean' },
        },
        required: ['includeReversed'],
        anyOf: [{ required: ['spreadId'] }, { required: ['count'] }],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const spread = resolveDrawInput(input, spreads);
        navigation.show('draw');
        draw.selectSpread(spread.id);
        draw.setReversed(input.includeReversed);
        return { spreadId: spread.id, spreadName: spread.name, cards: draw.draw() };
      },
    },
    {
      name: 'start_tarot_practice',
      title: '开始解读练习',
      description: '开始一道新的塔罗情境练习，替换当前题目并清空本次解读输入。',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        validateEmptyInput(input);
        const exercise = practice.start();
        navigation.show('practice');
        return exercise;
      },
    },
  ];
}

export function registerTarotTools(controllers, signal, context = document.modelContext) {
  if (!context?.registerTool) return;
  for (const tool of createTarotTools(controllers)) {
    try {
      Promise.resolve(context.registerTool(tool, { signal })).catch(error => {
        console.warn(`浏览器工具注册失败：${tool.name}`, error);
      });
    } catch (error) {
      console.warn(`浏览器工具注册失败：${tool.name}`, error);
    }
  }
}
