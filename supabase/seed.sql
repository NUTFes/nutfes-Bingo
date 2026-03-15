-- Seed numbers 1-99
INSERT INTO public.numbers (number)
SELECT n FROM generate_series(1, 99) n
ON CONFLICT (number) DO NOTHING;

-- Seed prizes
INSERT INTO public.prizes (name_jp, image_path) VALUES
('Apple Watch SE', '/PrizeItem/01_Apple Watch SE.jpg'),
('黒毛和牛1kg', '/PrizeItem/02_黒毛和牛1kg.jpg'),
('選べるペアチケット', '/PrizeItem/03_選べるペアチケット.jpg'),
('コーヒーメーカー', '/PrizeItem/04_コーヒーメーカー.jpg'),
('缶つま', '/PrizeItem/05_缶つま.jpg'),
('朝日山 天籟 越淡麗 純米大吟醸', '/PrizeItem/06_朝日山 天籟 越淡麗 純米大吟醸.jpg'),
('折りたたみ自転車', '/PrizeItem/07_折りたたみ自転車.jpg'),
('焼肉プレート', '/PrizeItem/08_焼肉プレート.jpg'),
('ジバニャン着ぐるみ', '/PrizeItem/09_ジバニャン着ぐるみ.jpg'),
('チュッパチャプス200本ツリー', '/PrizeItem/10_チュッパチャプス200本ツリー.jpg'),
('技大セット', '/PrizeItem/11_技大セット.jpg'),
('瓶コーラ12本セット', '/PrizeItem/12_瓶コーラ12本セット.jpg'),
('魚沼産コシヒカリ(2kg)', '/PrizeItem/13_魚沼産コシヒカリ(2kg).jpg'),
('着る毛布(サメ)', '/PrizeItem/14_着る毛布(サメ).jpg'),
('駄菓子 詰め合わせセット', '/PrizeItem/15_駄菓子 詰め合わせセット.jpg'),
('トトロクッション', '/PrizeItem/16_トトロクッション.jpg'),
('ハンディファン', '/PrizeItem/17_ハンディファン.jpg'),
('サウナハット', '/PrizeItem/18_サウナハット.jpg'),
('ご飯が炊ける弁当箱', '/PrizeItem/19_ご飯が炊ける弁当箱.jpg'),
('人生ゲームゴールデンドリーム', '/PrizeItem/20_人生ゲームゴールデンドリーム.jpg'),
('寝袋', '/PrizeItem/21_寝袋.jpg'),
('ソーダストリーム', '/PrizeItem/22_ソーダストリーム.jpg'),
('ナブラ演算子ゲーム', '/PrizeItem/23_ナブラ演算子ゲーム.jpg'),
('ダンベル', '/PrizeItem/24_ダンベル.jpg'),
('ニュートンのゆりかご', '/PrizeItem/25_ニュートンのゆりかご.jpg'),
('日めくりカレンダー(毎日アンミカ）', '/PrizeItem/26_日めくりカレンダー(毎日アンミカ）.jpg'),
('セクシー大根抱き枕', '/PrizeItem/27_セクシー大根抱き枕.jpg'),
('ペッパーミル', '/PrizeItem/28_ペッパーミル.jpg'),
('ザコシショウ来学記念セット', '/PrizeItem/29_ザコシショウ来学記念セット.jpg'),
('巨大クマのぬいぐるみ', '/PrizeItem/30_巨大クマのぬいぐるみ.jpg'),
('ハーゲンダッツ詰め合わせ', '/PrizeItem/31_ハーゲンダッツ詰め合わせ.jpg');
