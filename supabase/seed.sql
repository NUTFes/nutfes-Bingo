-- Seed numbers 1-99
INSERT INTO public.numbers (number)
SELECT n FROM generate_series(1, 99) n
ON CONFLICT (number) DO NOTHING;

-- Seed prizes only for an empty installation. Production seeding is explicit,
-- and repeated runs must not duplicate the initial prize catalog.
INSERT INTO public.prizes (name_jp, image_path, sort_order)
SELECT seed.name_jp, seed.image_path, seed.sort_order
FROM (VALUES
('Apple Watch SE', '/PrizeItem/01_Apple Watch SE.jpg', 1000),
('黒毛和牛1kg', '/PrizeItem/02_黒毛和牛1kg.jpg', 2000),
('選べるペアチケット', '/PrizeItem/03_選べるペアチケット.jpg', 3000),
('コーヒーメーカー', '/PrizeItem/04_コーヒーメーカー.jpg', 4000),
('缶つま', '/PrizeItem/05_缶つま.jpg', 5000),
('朝日山 天籟 越淡麗 純米大吟醸', '/PrizeItem/06_朝日山 天籟 越淡麗 純米大吟醸.jpg', 6000),
('折りたたみ自転車', '/PrizeItem/07_折りたたみ自転車.jpg', 7000),
('焼肉プレート', '/PrizeItem/08_焼肉プレート.jpg', 8000),
('ジバニャン着ぐるみ', '/PrizeItem/09_ジバニャン着ぐるみ.jpg', 9000),
('チュッパチャプス200本ツリー', '/PrizeItem/10_チュッパチャプス200本ツリー.jpg', 10000),
('技大セット', '/PrizeItem/11_技大セット.jpg', 11000),
('瓶コーラ12本セット', '/PrizeItem/12_瓶コーラ12本セット.jpg', 12000),
('魚沼産コシヒカリ(2kg)', '/PrizeItem/13_魚沼産コシヒカリ(2kg).jpg', 13000),
('着る毛布(サメ)', '/PrizeItem/14_着る毛布(サメ).jpg', 14000),
('駄菓子 詰め合わせセット', '/PrizeItem/15_駄菓子 詰め合わせセット.jpg', 15000),
('トトロクッション', '/PrizeItem/16_トトロクッション.jpg', 16000),
('ハンディファン', '/PrizeItem/17_ハンディファン.jpg', 17000),
('サウナハット', '/PrizeItem/18_サウナハット.jpg', 18000),
('ご飯が炊ける弁当箱', '/PrizeItem/19_ご飯が炊ける弁当箱.jpg', 19000),
('人生ゲームゴールデンドリーム', '/PrizeItem/20_人生ゲームゴールデンドリーム.jpg', 20000),
('寝袋', '/PrizeItem/21_寝袋.jpg', 21000),
('ソーダストリーム', '/PrizeItem/22_ソーダストリーム.jpg', 22000),
('ナブラ演算子ゲーム', '/PrizeItem/23_ナブラ演算子ゲーム.jpg', 23000),
('ダンベル', '/PrizeItem/24_ダンベル.jpg', 24000),
('ニュートンのゆりかご', '/PrizeItem/25_ニュートンのゆりかご.jpg', 25000),
('日めくりカレンダー(毎日アンミカ）', '/PrizeItem/26_日めくりカレンダー(毎日アンミカ）.jpg', 26000),
('セクシー大根抱き枕', '/PrizeItem/27_セクシー大根抱き枕.jpg', 27000),
('ペッパーミル', '/PrizeItem/28_ペッパーミル.jpg', 28000),
('ザコシショウ来学記念セット', '/PrizeItem/29_ザコシショウ来学記念セット.jpg', 29000),
('巨大クマのぬいぐるみ', '/PrizeItem/30_巨大クマのぬいぐるみ.jpg', 30000),
('ハーゲンダッツ詰め合わせ', '/PrizeItem/31_ハーゲンダッツ詰め合わせ.jpg', 31000)
) AS seed(name_jp, image_path, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.prizes);
