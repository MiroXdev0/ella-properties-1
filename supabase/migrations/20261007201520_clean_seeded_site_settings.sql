UPDATE public.site_settings
SET
  stat1_value = NULL,
  stat1_label = NULL,
  stat2_value = NULL,
  stat2_label = NULL,
  stat3_value = NULL,
  stat3_label = NULL
WHERE id = 1
  AND stat1_value = '15+'
  AND stat1_label = 'години опит'
  AND stat2_value = '500+'
  AND stat2_label = 'успешни сделки'
  AND stat3_value = '100%'
  AND stat3_label = 'коректност';

UPDATE public.site_settings
SET seo_home_keywords = NULL
WHERE id = 1
  AND seo_home_keywords IS NOT NULL;

UPDATE public.site_settings
SET
  seo_home_title = 'Елла Недвижими Имоти — Имоти в Перник и София',
  seo_home_description = 'Информация за имоти, услуги и контакти на Елла Недвижими Имоти. Съдействие при покупка, продажба и отдаване под наем.'
WHERE id = 1
  AND lower(btrim(seo_home_title)) = lower(btrim(brand_name))
  AND lower(btrim(seo_home_description)) = lower(btrim(brand_name));

UPDATE public.site_settings
SET address = 'Център, ул. „Райко Даскалов“ 4, 2300 Перник'
WHERE id = 1
  AND address NOT ILIKE '%Център%'
  AND address ILIKE '%Райко Даскалов%'
  AND address ILIKE '%2300 Перник%';
