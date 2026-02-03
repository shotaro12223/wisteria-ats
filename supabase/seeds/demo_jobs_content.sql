-- ============================================
-- デモ求人に詳細コンテンツを追加
-- ============================================
-- 【前提条件】
-- 1. 20250124_add_job_content_columns.sql マイグレーション実行済み
-- 2. demo_data.sql 実行済み（企業、求人、応募者が存在する）
--
-- 【使用方法】
-- Supabase SQL Editor でこのSQLを実行
-- ============================================

-- 求人1: Webエンジニア
UPDATE jobs SET
  catch_copy = '最新技術で社会課題を解決！成長中のIT企業でキャリアアップしませんか？',
  job_category = 'ITエンジニア・Webエンジニア',
  hiring_count = '2名',

  postal_code = '150-0001',
  prefecture_city_town = '東京都渋谷区神宮前',
  address_line = '1-2-3',
  building_floor = 'サンプルビル 5F',
  nearest_station = 'JR山手線 原宿駅 徒歩5分、東京メトロ千代田線 明治神宮前駅 徒歩3分',

  work_hours = '10:00〜19:00（実働8時間）',
  break_time = '60分',
  work_style = 'ハイブリッド勤務（週2日出社、週3日リモート可）',
  overtime_hours = '月平均20時間程度',

  pay_type = '月給',
  pay_min = 350000,
  pay_max = 600000,
  gross_pay = '35万円〜60万円',
  bonus = '年2回（6月・12月）※業績による',
  raise = '年1回（4月）',
  annual_income_example = '年収500万円（28歳・経験3年）、年収650万円（32歳・経験6年）',

  holidays = '完全週休2日制（土日祝）',
  annual_holidays = '年間休日125日',
  leave = '有給休暇（入社半年後10日付与）、夏季休暇、年末年始休暇、慶弔休暇',
  childcare_leave = '取得実績あり（男性の育休取得も推奨）',

  job_description = 'SaaSプロダクトのフロントエンド開発をお任せします。

【具体的な業務内容】
・React/TypeScriptを用いたWebアプリケーション開発
・UIコンポーネントの設計・実装
・API連携機能の実装
・コードレビュー、技術的な改善提案
・新規機能の企画段階からの参画

【開発環境】
・言語：TypeScript
・フレームワーク：React, Next.js
・スタイリング：Tailwind CSS
・状態管理：Zustand, TanStack Query
・テスト：Jest, Playwright
・インフラ：Vercel, Supabase
・その他：GitHub, Slack, Notion',

  qualifications = '【必須スキル】
・React/TypeScriptでの開発経験2年以上
・Git/GitHubを用いたチーム開発経験

【歓迎スキル】
・Next.jsでの開発経験
・Tailwind CSSの使用経験
・バックエンド開発の経験
・スクラム/アジャイル開発の経験',

  education_experience = '学歴不問',

  benefits = '交通費全額支給、各種社会保険完備、健康診断、資格取得支援制度、書籍購入補助、リモートワーク手当（月5,000円）、ウォーターサーバー完備',
  social_insurance = '健康保険、厚生年金、雇用保険、労災保険',
  passive_smoking = '屋内禁煙（喫煙専用室あり）',

  appeal_points = '【この仕事の魅力】
・最新技術を積極的に採用！スキルアップできる環境
・フラットな組織文化で、年齢や経験に関係なく意見が言える
・自社プロダクト開発のため、ユーザーの声を直接聞ける
・リモートワーク可能で、ワークライフバランスを重視

【チーム構成】
エンジニア8名（フロント4名、バックエンド3名、インフラ1名）
平均年齢30歳、20代〜30代が中心の活気あるチームです。',

  probation = 'あり',
  probation_period = '3ヶ月',
  probation_condition = '同条件',

  contact_email = 'recruit@sampletech.example.com',
  contact_phone = '03-1234-5678',

  site_status = '{
    "Indeed": {"status": "掲載中", "updatedAt": "2025-01-20T10:00:00Z"},
    "求人BOX": {"status": "掲載中", "updatedAt": "2025-01-18T09:00:00Z"},
    "Engage": {"status": "準備中", "updatedAt": "2025-01-15T11:00:00Z"},
    "AirWork": {"status": "媒体審査中", "updatedAt": "2025-01-19T14:00:00Z"}
  }'::jsonb,

  updated_at = NOW()
WHERE id = 'demo-job-001';


-- 求人2: 法人営業
UPDATE jobs SET
  catch_copy = '成長市場で活躍！IT業界の法人営業としてキャリアを築こう',
  job_category = '法人営業・ソリューション営業',
  hiring_count = '3名',

  postal_code = '150-0001',
  prefecture_city_town = '東京都渋谷区神宮前',
  address_line = '1-2-3',
  building_floor = 'サンプルビル 5F',
  nearest_station = 'JR山手線 原宿駅 徒歩5分、東京メトロ千代田線 明治神宮前駅 徒歩3分',

  work_hours = '9:00〜18:00（実働8時間）',
  break_time = '60分',
  work_style = '出社勤務（直行直帰可）',
  overtime_hours = '月平均25時間程度',

  pay_type = '月給',
  pay_min = 280000,
  pay_max = 450000,
  gross_pay = '28万円〜45万円 + インセンティブ',
  bonus = '年2回（6月・12月）+ 成果インセンティブ（四半期毎）',
  raise = '年1回（4月）',
  annual_income_example = '年収450万円（26歳・経験2年）、年収600万円（30歳・経験5年）※インセンティブ含む',

  holidays = '完全週休2日制（土日祝）',
  annual_holidays = '年間休日125日',
  leave = '有給休暇、夏季休暇、年末年始休暇、慶弔休暇、リフレッシュ休暇（勤続3年で5日付与）',
  childcare_leave = '取得実績あり',

  job_description = '中小企業向けに自社SaaSプロダクトの提案営業を行います。

【具体的な業務内容】
・新規顧客へのアプローチ（テレアポ、展示会、紹介など）
・商談・プレゼンテーション
・見積作成、契約締結
・導入後のフォローアップ
・既存顧客へのアップセル・クロスセル提案

【営業スタイル】
・担当エリア：東京都、神奈川県、千葉県、埼玉県
・1日の商談数：平均2〜3件
・新規:既存 = 6:4

【取り扱いサービス】
・業務効率化SaaS（月額5万円〜50万円）
・導入企業数500社突破の成長サービス',

  qualifications = '【必須条件】
・法人営業経験2年以上
・普通自動車免許

【歓迎条件】
・IT業界での営業経験
・SaaS商材の営業経験
・新規開拓営業の経験',

  education_experience = '高卒以上',

  benefits = '交通費全額支給、営業交通費全額支給、各種社会保険完備、健康診断、社用車貸与、携帯電話貸与、営業インセンティブ制度',
  social_insurance = '健康保険、厚生年金、雇用保険、労災保険',
  passive_smoking = '屋内禁煙（喫煙専用室あり）',

  appeal_points = '【この仕事の魅力】
・成果がダイレクトに報酬に反映！トップセールスは年収800万円超
・導入企業500社突破の成長プロダクトを扱える
・充実した研修制度（入社後2週間の座学研修 + 3ヶ月のOJT）
・裁量が大きく、自分で考えて動ける環境

【キャリアパス】
入社2年目でリーダー、4年目でマネージャー昇進の実績あり',

  probation = 'あり',
  probation_period = '3ヶ月',
  probation_condition = '同条件',

  contact_email = 'recruit@sampletech.example.com',
  contact_phone = '03-1234-5678',

  site_status = '{
    "AirWork": {"status": "掲載中", "updatedAt": "2025-01-19T14:00:00Z"},
    "Engage": {"status": "準備中", "updatedAt": "2025-01-15T11:00:00Z"},
    "Indeed": {"status": "停止中", "updatedAt": "2025-01-10T09:00:00Z"},
    "はたらきんぐ": {"status": "掲載中", "updatedAt": "2025-01-18T10:00:00Z"}
  }'::jsonb,

  updated_at = NOW()
WHERE id = 'demo-job-002';


-- 求人3: 総務・人事アシスタント
UPDATE jobs SET
  catch_copy = '未経験歓迎！バックオフィスのプロフェッショナルを目指しませんか？',
  job_category = '総務・人事・労務',
  hiring_count = '1名',

  postal_code = '150-0001',
  prefecture_city_town = '東京都渋谷区神宮前',
  address_line = '1-2-3',
  building_floor = 'サンプルビル 5F',
  nearest_station = 'JR山手線 原宿駅 徒歩5分、東京メトロ千代田線 明治神宮前駅 徒歩3分',

  work_hours = '9:30〜18:30（実働8時間）',
  break_time = '60分',
  work_style = '出社勤務（週1日在宅勤務可）',
  overtime_hours = '月平均10時間程度',

  pay_type = '月給',
  pay_min = 230000,
  pay_max = 300000,
  gross_pay = '23万円〜30万円',
  bonus = '年2回（6月・12月）※業績による',
  raise = '年1回（4月）',
  annual_income_example = '年収320万円（25歳・経験1年）、年収380万円（28歳・経験3年）',

  holidays = '完全週休2日制（土日祝）',
  annual_holidays = '年間125日',
  leave = '有給休暇、夏季休暇、年末年始休暇、慶弔休暇、産前産後休暇',
  childcare_leave = '取得実績あり',

  job_description = '総務・人事部門のアシスタントとして、幅広いバックオフィス業務をお任せします。

【具体的な業務内容】
＜総務業務＞
・来客対応、電話対応
・備品管理、発注
・社内イベントの企画・運営サポート
・オフィス環境の整備

＜人事業務＞
・採用活動のサポート（求人掲載、応募者対応、面接調整）
・入退社手続き
・勤怠管理
・社員からの問い合わせ対応

＜その他＞
・各種書類作成（Excel、Word）
・経費精算処理
・来客用お茶出し など',

  qualifications = '【必須条件】
・基本的なPCスキル（Excel、Word）
・社会人経験1年以上

【歓迎条件】
・総務・人事の経験
・事務職の経験
・簿記資格',

  education_experience = '高卒以上',

  benefits = '交通費全額支給（月3万円まで）、各種社会保険完備、健康診断、服装自由（オフィスカジュアル）、ウォーターサーバー完備、お菓子コーナーあり',
  social_insurance = '健康保険、厚生年金、雇用保険、労災保険',
  passive_smoking = '屋内禁煙（喫煙専用室あり）',

  appeal_points = '【この仕事の魅力】
・未経験からバックオフィスのスキルを身につけられる
・残業少なめでプライベートも充実
・少人数の会社なので、幅広い業務を経験できる
・風通しの良い職場環境

【こんな方におすすめ】
・人をサポートする仕事が好きな方
・コツコツ丁寧に仕事を進められる方
・明るく元気に対応できる方',

  probation = 'あり',
  probation_period = '3ヶ月',
  probation_condition = '同条件',

  contact_email = 'recruit@sampletech.example.com',
  contact_phone = '03-1234-5678',

  site_status = '{
    "ハローワーク": {"status": "掲載中", "updatedAt": "2025-01-21T08:00:00Z"},
    "げんきワーク": {"status": "掲載中", "updatedAt": "2025-01-20T09:00:00Z"},
    "ジモティー": {"status": "準備中", "updatedAt": "2025-01-19T11:00:00Z"}
  }'::jsonb,

  updated_at = NOW()
WHERE id = 'demo-job-003';


-- ============================================
-- 確認
-- ============================================
SELECT id, job_title,
  catch_copy IS NOT NULL as has_catch_copy,
  job_description IS NOT NULL as has_description,
  site_status
FROM jobs
WHERE company_id = 'demo-company-001';
