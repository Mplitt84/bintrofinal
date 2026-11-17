-- Green Circle Salons members book recycling pickups on Hair Mail Hub.
UPDATE "sustainability_partners" SET "pickup_url" = 'https://hairmailhub.greencirclesalons.com/my-account/schedule-pickup/'
WHERE "pickup_url" = '' AND lower("name") LIKE 'green circle%';
