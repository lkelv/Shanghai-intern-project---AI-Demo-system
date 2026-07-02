import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Lang = 'en' | 'zh'

type Entry = { en: string; zh: string }

const DICT: Record<string, Entry> = {
  // Dev panel (translated too, on request)
  'dev.title': { en: 'dev panel', zh: '开发面板' },
  'dev.reset': { en: 'reset', zh: '重置' },
  'dev.desc': {
    en: 'not shown to the customer — jump between stages and watch the captured record grow.',
    zh: '客户看不到 —— 可在各阶段之间跳转，并查看已捕获的记录。',
  },
  'dev.translate': { en: 'translate UI', zh: '界面语言' },
  'dev.captured': { en: 'captured → journey.json', zh: '已捕获 → journey.json' },
  'dev.session': { en: 'session', zh: '会话' },
  'dev.email': { en: 'email', zh: '邮箱' },
  'dev.need': { en: 'need', zh: '需求' },
  'dev.plan': { en: 'plan', zh: '方案' },
  'dev.payment': { en: 'payment', zh: '支付' },
  'dev.paid': { en: 'PAID', zh: '已支付' },

  // Stage labels + hints (dev panel stepper)
  'stage.acquisition.label': { en: 'Acquisition', zh: '获客' },
  'stage.acquisition.hint': { en: 'First contact', zh: '首次接触' },
  'stage.retention.label': { en: 'Retention', zh: '留存' },
  'stage.retention.hint': { en: 'Follow-up', zh: '跟进' },
  'stage.conversion.label': { en: 'Conversion', zh: '转化' },
  'stage.conversion.hint': { en: 'Choose a plan', zh: '选择方案' },
  'stage.payment.label': { en: 'Payment', zh: '支付' },
  'stage.payment.hint': { en: 'Checkout', zh: '结算' },

  'composer.type': { en: 'Type a message', zh: '输入消息…' },

  'acq.title': { en: 'OnePromise Assistant', zh: 'OnePromise 助手' },
  'acq.subtitle': { en: 'online · replies instantly', zh: '在线 · 即时回复' },
  'acq.continue': { en: 'Continue to follow-up', zh: '继续到跟进' },

  'ret.title': { en: 'OnePromise · Follow-up', zh: 'OnePromise · 跟进' },
  'ret.subtitle': { en: 'day 2 · re-engaging', zh: '第 2 天 · 再互动' },
  'ret.simulate': { en: 'simulate the passage of time', zh: '模拟时间流逝' },
  'ret.nextDay': { en: 'Next day', zh: '第二天' },
  'ret.replyPlaceholder': {
    en: 'Reply to the follow-up…',
    zh: '回复跟进消息…',
  },
  'ret.emptyTitle': { en: 'A day goes by…', zh: '一天过去了…' },
  'ret.emptyHint': {
    en: 'Hit {btn} to have the assistant follow up and re-engage the customer.',
    zh: '点击「{btn}」，让助手发送跟进消息、重新联系客户。',
  },
  'ret.seePlans': { en: 'See the plans', zh: '查看方案' },

  'store.name': { en: 'OnePromise Store', zh: 'OnePromise 商店' },
  'conv.title': { en: 'Choose your plan', zh: '选择你的方案' },
  'conv.catalogName': {
    en: 'OnePromise AI Training Course',
    zh: 'OnePromise AI 培训课程',
  },
  'conv.recommended': { en: 'Recommended for you', zh: '为你推荐' },
  'conv.mostPopular': { en: 'Most popular', zh: '最受欢迎' },
  'conv.choose': { en: 'Choose {name}', zh: '选择{name}' },
  'conv.selected': { en: '✓ Selected', zh: '✓ 已选择' },
  'conv.adding': { en: 'Adding…', zh: '添加中…' },
  'conv.checkout': {
    en: 'Checkout · {name} ${price}',
    zh: '去结算 · {name} ${price}',
  },
  'conv.askPlaceholder': {
    en: 'Ask the assistant about the plans…',
    zh: '向助手咨询方案…',
  },

  'pay.secure': { en: 'Secure checkout', zh: '安全结算' },
  'pay.testMode': { en: 'test mode', zh: '测试模式' },
  'pay.course': { en: 'OnePromise AI Course', zh: 'OnePromise AI 课程' },
  'pay.cardDetails': { en: 'Card details', zh: '银行卡信息' },
  'pay.nameOnCard': { en: 'Name on card', zh: '持卡人姓名' },
  'pay.cardNumber': { en: 'Card number', zh: '卡号' },
  'pay.expiry': { en: 'Expiry', zh: '有效期' },
  'pay.cvc': { en: 'CVC', zh: '安全码' },
  'pay.pay': { en: 'Pay ${price}', zh: '支付 ${price}' },
  'pay.processing': { en: 'Processing…', zh: '处理中…' },
  'pay.noMoney': {
    en: 'No real money moves — this is a mock checkout.',
    zh: '不会产生任何真实扣款 —— 这是模拟结算。',
  },
  'pay.noPlan': {
    en: 'No plan selected yet. Go back to the Conversion stage and choose one.',
    zh: '尚未选择方案。请返回“转化”阶段选择一个。',
  },
  'receipt.success': { en: 'Payment successful', zh: '支付成功' },
  'receipt.item': { en: 'Item', zh: '商品' },
  'receipt.card': { en: 'Card', zh: '银行卡' },
  'receipt.email': { en: 'Email', zh: '邮箱' },
  'receipt.paid': { en: 'Paid', zh: '支付时间' },
  'receipt.status': { en: 'Status', zh: '状态' },
  'receipt.paidValue': { en: 'PAID', zh: '已支付' },
  'receipt.assistant': { en: 'assistant', zh: '助手' },
  'receipt.demoNote': {
    en: 'demo · no real payment was taken · saved to journey.json',
    zh: '演示 · 未产生真实支付 · 已保存至 journey.json',
  },
}

// Translations for the product tiers (display only — journey.json keeps the
// canonical English names).
const TIERS: Record<
  string,
  { name: Entry; blurb: Entry; features: Entry[] }
> = {
  starter: {
    name: { en: 'Starter', zh: '入门版' },
    blurb: {
      en: 'Self-paced fundamentals for individuals getting started with AI.',
      zh: '面向刚接触 AI 的个人的自学基础课程。',
    },
    features: [
      { en: '8 core modules, self-paced', zh: '8 个核心模块，自主学习' },
      { en: 'Hands-on notebooks', zh: '动手实操 notebook' },
      { en: 'Community forum access', zh: '社区论坛权限' },
      { en: 'Certificate of completion', zh: '结业证书' },
    ],
  },
  professional: {
    name: { en: 'Professional', zh: '专业版' },
    blurb: {
      en: 'For practitioners who want real projects and mentor feedback.',
      zh: '面向希望参与真实项目并获得导师反馈的从业者。',
    },
    features: [
      { en: 'Everything in Starter', zh: '包含入门版全部内容' },
      { en: '12 advanced modules', zh: '12 个进阶模块' },
      { en: '3 graded projects with feedback', zh: '3 个带反馈的实战项目' },
      { en: 'Live weekly Q&A sessions', zh: '每周直播答疑' },
    ],
  },
  team: {
    name: { en: 'Team', zh: '团队版' },
    blurb: {
      en: 'For teams rolling out AI skills across the organisation.',
      zh: '面向在组织内推广 AI 技能的团队。',
    },
    features: [
      { en: 'Everything in Professional', zh: '包含专业版全部内容' },
      { en: 'Up to 10 seats', zh: '最多 10 个席位' },
      { en: 'Private cohort & onboarding', zh: '专属班级与入职引导' },
      { en: 'Admin progress dashboard', zh: '管理员进度看板' },
    ],
  },
}

interface TierText {
  name: string
  blurb: string
  features: string[]
}

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
  tTier: (id: string) => TierText | null
}

const LangContext = createContext<Ctx | null>(null)
const STORAGE = 'op_lang'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem(STORAGE) === 'zh' ? 'zh' : 'en'
    } catch {
      return 'en'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, lang)
    } catch {
      /* non-fatal */
    }
  }, [lang])

  function t(key: string, params?: Record<string, string | number>) {
    let s = DICT[key]?.[lang] ?? key
    if (params) {
      for (const k of Object.keys(params)) {
        s = s.replaceAll(`{${k}}`, String(params[k]))
      }
    }
    return s
  }

  function tTier(id: string): TierText | null {
    const e = TIERS[id]
    if (!e) return null
    return {
      name: e.name[lang],
      blurb: e.blurb[lang],
      features: e.features.map((f) => f[lang]),
    }
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t, tTier }}>
      {children}
    </LangContext.Provider>
  )
}

export function useT(): Ctx {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useT must be used within LangProvider')
  return ctx
}
