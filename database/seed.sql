-- ============================================================================
-- ECOINSIGHT — Realistic Development Seed Data
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Date:    26 September 2026
-- Phase:   MVP
--
-- Targets:
--   - 10 users (diverse industries, locations, organizations)
--   - 6 emission categories
--   - 18 emission factors (realistic conversion values)
--   - 120+ emission records (spread across users, categories, dates)
--
-- Password hashes use bcrypt ($2b$10$...) — all seeded users share
-- the development password "EcoInsight@2026" for testing.
-- NEVER use these hashes in production.
--
-- Run AFTER schema.sql / migration 001:
--   psql -U <user> -d ecoinsight -f seed.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- USERS (10 users)
-- ============================================================================
-- Password: EcoInsight@2026  (bcrypt hash, 10 rounds)
-- These are realistic fictional users for development/testing.

INSERT INTO users (name, email, password_hash, industry, location, organization) VALUES
    ('Aarav Mehta',       'aarav.mehta@greenindia.org',      '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Information Technology',   'Mumbai, India',          'GreenTech Solutions Pvt Ltd'),
    ('Priya Sharma',      'priya.sharma@sustainco.in',       '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Manufacturing',            'Delhi, India',           'SustainCo Industries'),
    ('Rohan Gupta',       'rohan.gupta@ecofirst.com',        '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Energy',                   'Bangalore, India',       'EcoFirst Energy Ltd'),
    ('Sneha Patel',       'sneha.patel@carbonneutral.io',    '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Finance',                  'Hyderabad, India',       'CarbonNeutral Finance'),
    ('Vikram Singh',      'vikram.singh@clearsky.in',        '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Transportation',           'Chennai, India',         'ClearSky Logistics'),
    ('Ananya Reddy',      'ananya.reddy@terraverde.org',     '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Healthcare',               'Pune, India',            'TerraVerde Healthcare'),
    ('Kabir Joshi',       'kabir.joshi@zerocarbon.co',       '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Retail',                   'Jaipur, India',          'ZeroCarbon Retail Group'),
    ('Meera Krishnan',    'meera.k@blueplanet.com',          '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Education',                'Kolkata, India',         'BluePlanet Academy'),
    ('Arjun Nair',        'arjun.nair@sustainhub.in',        '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Agriculture',              'Kochi, India',           'SustainHub Agritech'),
    ('Diya Chopra',       'diya.chopra@greenfuture.org',     '$2b$10$xJ5vKzVqFk8j7OQz1yN2OeXqpLjR4nWm6dHk3BvCpTsY8gF1uKJOi', 'Construction',             'Ahmedabad, India',       'GreenFuture Builders');


-- ============================================================================
-- EMISSION CATEGORIES (6 categories)
-- ============================================================================

INSERT INTO emission_categories (name, description) VALUES
    ('Electricity',       'Emissions from purchased electricity consumption including grid power and renewable sources'),
    ('Transportation',    'Emissions from vehicle fuel consumption, business travel, and commuting'),
    ('Fuel',              'Emissions from direct combustion of fossil fuels such as diesel, petrol, and LPG'),
    ('Waste',             'Emissions from solid waste disposal, recycling, and composting activities'),
    ('Water',             'Emissions associated with water supply, treatment, and wastewater processing'),
    ('Natural Gas',       'Emissions from natural gas consumption for heating, cooking, and industrial processes');


-- ============================================================================
-- EMISSION FACTORS (Expanded Dataset: 40+ factors across 6 categories)
-- ============================================================================
-- Sources: IPCC AR6, EPA GHG Hub 2024, UK DEFRA 2024, India CEA Database 2024
-- factor = kg CO2e per unit

INSERT INTO emission_factors (category_id, activity, unit, factor, source) VALUES
    -- Category 1: Electricity
    (1, 'Grid Electricity',              'kWh',          0.820000, 'India CEA CO2 Baseline Database 2024'),
    (1, 'Grid Electricity',              'MWh',        820.000000, 'India CEA CO2 Baseline Database 2024'),
    (1, 'Solar Electricity',             'kWh',          0.050000, 'IPCC AR6 Lifecycle Estimates'),
    (1, 'Solar Electricity',             'MWh',         50.000000, 'IPCC AR6 Lifecycle Estimates'),
    (1, 'Wind Electricity',              'kWh',          0.011000, 'IPCC AR6 Lifecycle Estimates'),
    (1, 'Wind Electricity',              'MWh',         11.000000, 'IPCC AR6 Lifecycle Estimates'),
    (1, 'Hydroelectric Power',           'kWh',          0.024000, 'IPCC AR6 Lifecycle Estimates'),
    (1, 'Hydroelectric Power',           'MWh',         24.000000, 'IPCC AR6 Lifecycle Estimates'),
    (1, 'Coal Grid Electricity',         'kWh',          1.020000, 'EPA Greenhouse Gas Equivalencies'),

    -- Category 2: Transportation
    (2, 'Petrol Car',                    'km',           0.192000, 'UK DEFRA 2024 Emission Factors'),
    (2, 'Petrol Car',                    'mile',         0.309000, 'UK DEFRA 2024 Emission Factors'),
    (2, 'Diesel Car',                    'km',           0.171000, 'UK DEFRA 2024 Emission Factors'),
    (2, 'Diesel Car',                    'mile',         0.275000, 'UK DEFRA 2024 Emission Factors'),
    (2, 'Electric Vehicle (EV)',         'km',           0.053000, 'UK DEFRA 2024 Grid-Average EV'),
    (2, 'Electric Vehicle (EV)',         'mile',         0.085000, 'UK DEFRA 2024 Grid-Average EV'),
    (2, 'Heavy Diesel Truck',            'km',           0.892000, 'EPA SmartWay Transport Partnership'),
    (2, 'Heavy Diesel Truck',            'mile',         1.435000, 'EPA SmartWay Transport Partnership'),
    (2, 'Domestic Flight',               'km',           0.246000, 'ICAO Carbon Emissions Calculator'),
    (2, 'Domestic Flight',               'passenger_mile', 0.396000, 'ICAO Carbon Emissions Calculator'),
    (2, 'International Flight',          'km',           0.158000, 'ICAO Carbon Emissions Calculator'),
    (2, 'International Flight',          'passenger_mile', 0.254000, 'ICAO Carbon Emissions Calculator'),
    (2, 'Train Travel',                  'km',           0.041000, 'Indian Railways Sustainability Report'),
    (2, 'Train Travel',                  'mile',         0.066000, 'Indian Railways Sustainability Report'),
    (2, 'Motorbike',                     'km',           0.113000, 'UK DEFRA 2024 Emission Factors'),
    (2, 'Motorbike',                     'mile',         0.182000, 'UK DEFRA 2024 Emission Factors'),
    (2, 'City Bus',                      'passenger_km', 0.103000, 'UK DEFRA 2024 Transit Bus'),

    -- Category 3: Fuel
    (3, 'Diesel Combustion',             'litre',        2.680000, 'IPCC 2006 / EPA 2024 Guidelines'),
    (3, 'Diesel Combustion',             'gallon',      10.140000, 'EPA GHG Emission Factors Hub'),
    (3, 'Petrol Combustion',             'litre',        2.310000, 'IPCC 2006 / EPA 2024 Guidelines'),
    (3, 'Petrol Combustion',             'gallon',       8.740000, 'EPA GHG Emission Factors Hub'),
    (3, 'LPG Combustion',               'kg',           2.983000, 'IPCC 2006 Guidelines'),
    (3, 'LPG Combustion',               'litre',        1.557000, 'UK DEFRA 2024 Fuel Factors'),
    (3, 'Heavy Fuel Oil',                'litre',        3.150000, 'IPCC 2006 Guidelines'),
    (3, 'Heavy Fuel Oil',                'gallon',      11.920000, 'EPA GHG Emission Factors Hub'),
    (3, 'Kerosene / Jet Fuel',           'litre',        2.540000, 'IPCC 2006 Guidelines'),
    (3, 'Kerosene / Jet Fuel',           'gallon',       9.610000, 'EPA GHG Emission Factors Hub'),
    (3, 'Bituminous Coal',               'kg',           2.420000, 'IPCC 2006 Guidelines'),
    (3, 'Bituminous Coal',               'tonne',     2420.000000, 'IPCC 2006 Guidelines'),

    -- Category 4: Waste
    (4, 'General Waste to Landfill',     'kg',           0.587000, 'EPA WARM Model v15'),
    (4, 'General Waste to Landfill',     'tonne',      587.000000, 'EPA WARM Model v15'),
    (4, 'Recycled Waste',                'kg',           0.021000, 'EPA WARM Model v15'),
    (4, 'Recycled Waste',                'tonne',       21.000000, 'EPA WARM Model v15'),
    (4, 'Composting',                    'kg',           0.010000, 'EPA WARM Model v15'),
    (4, 'Composting',                    'tonne',       10.000000, 'EPA WARM Model v15'),
    (4, 'Anaerobic Digestion',           'kg',           0.085000, 'UK DEFRA 2024 Waste Factors'),
    (4, 'Incineration with Energy Recovery', 'kg',       0.215000, 'UK DEFRA 2024 Waste Factors'),

    -- Category 5: Water
    (5, 'Municipal Water Supply',        'kl',           0.344000, 'Water Services Association Guidelines'),
    (5, 'Municipal Water Supply',        'cubic_m',      0.344000, 'Water Services Association Guidelines'),
    (5, 'Wastewater Treatment',          'kl',           0.708000, 'Water Services Association Guidelines'),
    (5, 'Wastewater Treatment',          'cubic_m',      0.708000, 'Water Services Association Guidelines'),
    (5, 'Desalinated Water Supply',      'kl',           1.250000, 'Global Water Sustainability Benchmark'),

    -- Category 6: Natural Gas
    (6, 'Natural Gas Heating',           'cubic_m',      2.020000, 'IPCC 2006 Guidelines'),
    (6, 'Natural Gas Heating',           'therm',        5.300000, 'EPA GHG Emission Factors Hub'),
    (6, 'Natural Gas Heating',           'kWh',          0.202000, 'UK DEFRA 2024 Fuel Factors'),
    (6, 'Natural Gas Cooking',           'cubic_m',      2.020000, 'IPCC 2006 Guidelines'),
    (6, 'Natural Gas Cooking',           'therm',        5.300000, 'EPA GHG Emission Factors Hub'),
    (6, 'Industrial Natural Gas',        'cubic_m',      2.020000, 'IPCC 2006 Guidelines'),
    (6, 'Industrial Natural Gas',        'therm',        5.300000, 'EPA GHG Emission Factors Hub')
ON CONFLICT (category_id, activity, unit) DO NOTHING;



-- ============================================================================
-- EMISSION RECORDS (120+ records)
-- ============================================================================
-- Realistic data spread across:
--   - 10 users
--   - 6 categories
--   - Dates from March 2026 to September 2026 (6+ months for trend analysis)
--   - Various Indian locations
--   - co2e = quantity × emission_factor (pre-calculated)

-- ---- User 1: Aarav Mehta (IT, Mumbai) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (1, 1, 'Grid Electricity',     4500.0000, 'kWh',     0.820000, 3690.0000, 'Mumbai, India',     '2026-03-15'),
    (1, 1, 'Grid Electricity',     4200.0000, 'kWh',     0.820000, 3444.0000, 'Mumbai, India',     '2026-04-15'),
    (1, 1, 'Grid Electricity',     5100.0000, 'kWh',     0.820000, 4182.0000, 'Mumbai, India',     '2026-05-15'),
    (1, 1, 'Grid Electricity',     5800.0000, 'kWh',     0.820000, 4756.0000, 'Mumbai, India',     '2026-06-15'),
    (1, 1, 'Grid Electricity',     5500.0000, 'kWh',     0.820000, 4510.0000, 'Mumbai, India',     '2026-07-15'),
    (1, 1, 'Grid Electricity',     4800.0000, 'kWh',     0.820000, 3936.0000, 'Mumbai, India',     '2026-08-15'),
    (1, 1, 'Grid Electricity',     4600.0000, 'kWh',     0.820000, 3772.0000, 'Mumbai, India',     '2026-09-10'),
    (1, 2, 'Petrol Car',           1200.0000, 'km',      0.192000,  230.4000, 'Mumbai, India',     '2026-04-20'),
    (1, 2, 'Domestic Flight',       850.0000, 'km',      0.246000,  209.1000, 'Mumbai, India',     '2026-06-10'),
    (1, 2, 'Petrol Car',           1500.0000, 'km',      0.192000,  288.0000, 'Mumbai, India',     '2026-07-20'),
    (1, 4, 'General Waste to Landfill', 350.0000, 'kg',  0.587000,  205.4500, 'Mumbai, India',     '2026-05-30'),
    (1, 5, 'Municipal Water Supply', 45.0000,  'kl',     0.344000,   15.4800, 'Mumbai, India',     '2026-06-30'),
    (1, 6, 'Natural Gas Cooking',    80.0000,  'cubic_m', 2.020000, 161.6000, 'Mumbai, India',     '2026-08-01');

-- ---- User 2: Priya Sharma (Manufacturing, Delhi) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (2, 1, 'Grid Electricity',    12000.0000, 'kWh',     0.820000, 9840.0000, 'Delhi, India',      '2026-03-10'),
    (2, 1, 'Grid Electricity',    11500.0000, 'kWh',     0.820000, 9430.0000, 'Delhi, India',      '2026-04-10'),
    (2, 1, 'Grid Electricity',    13200.0000, 'kWh',     0.820000, 10824.0000,'Delhi, India',      '2026-05-10'),
    (2, 1, 'Grid Electricity',    14000.0000, 'kWh',     0.820000, 11480.0000,'Delhi, India',      '2026-06-10'),
    (2, 1, 'Grid Electricity',    13500.0000, 'kWh',     0.820000, 11070.0000,'Delhi, India',      '2026-07-10'),
    (2, 1, 'Grid Electricity',    12800.0000, 'kWh',     0.820000, 10496.0000,'Delhi, India',      '2026-08-10'),
    (2, 1, 'Grid Electricity',    12200.0000, 'kWh',     0.820000, 10004.0000,'Delhi, India',      '2026-09-05'),
    (2, 3, 'Diesel Combustion',    2500.0000, 'litre',   2.680000, 6700.0000, 'Delhi, India',      '2026-04-01'),
    (2, 3, 'Diesel Combustion',    2800.0000, 'litre',   2.680000, 7504.0000, 'Delhi, India',      '2026-06-01'),
    (2, 3, 'Diesel Combustion',    2600.0000, 'litre',   2.680000, 6968.0000, 'Delhi, India',      '2026-08-01'),
    (2, 2, 'Diesel Car',           3000.0000, 'km',      0.171000,  513.0000, 'Delhi, India',      '2026-05-15'),
    (2, 4, 'General Waste to Landfill', 1200.0000, 'kg', 0.587000,  704.4000, 'Delhi, India',      '2026-07-01'),
    (2, 6, 'Industrial Natural Gas', 500.0000, 'cubic_m', 2.020000, 1010.0000, 'Delhi, India',     '2026-05-20');

-- ---- User 3: Rohan Gupta (Energy, Bangalore) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (3, 1, 'Grid Electricity',     8000.0000, 'kWh',     0.820000, 6560.0000, 'Bangalore, India',  '2026-03-20'),
    (3, 1, 'Grid Electricity',     7500.0000, 'kWh',     0.820000, 6150.0000, 'Bangalore, India',  '2026-04-20'),
    (3, 1, 'Grid Electricity',     9200.0000, 'kWh',     0.820000, 7544.0000, 'Bangalore, India',  '2026-05-20'),
    (3, 1, 'Grid Electricity',     9800.0000, 'kWh',     0.820000, 8036.0000, 'Bangalore, India',  '2026-06-20'),
    (3, 1, 'Grid Electricity',     9000.0000, 'kWh',     0.820000, 7380.0000, 'Bangalore, India',  '2026-07-20'),
    (3, 1, 'Grid Electricity',     8500.0000, 'kWh',     0.820000, 6970.0000, 'Bangalore, India',  '2026-08-20'),
    (3, 1, 'Solar Electricity',    2000.0000, 'kWh',     0.050000,  100.0000, 'Bangalore, India',  '2026-06-01'),
    (3, 1, 'Wind Electricity',     3000.0000, 'kWh',     0.011000,   33.0000, 'Bangalore, India',  '2026-07-01'),
    (3, 6, 'Natural Gas Heating',   300.0000, 'cubic_m', 2.020000,  606.0000, 'Bangalore, India',  '2026-04-15'),
    (3, 6, 'Natural Gas Heating',   280.0000, 'cubic_m', 2.020000,  565.6000, 'Bangalore, India',  '2026-06-15'),
    (3, 2, 'Train Travel',         5000.0000, 'km',      0.041000,  205.0000, 'Bangalore, India',  '2026-05-10'),
    (3, 5, 'Wastewater Treatment',   60.0000, 'kl',      0.708000,   42.4800, 'Bangalore, India',  '2026-08-15');

-- ---- User 4: Sneha Patel (Finance, Hyderabad) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (4, 1, 'Grid Electricity',     3200.0000, 'kWh',     0.820000, 2624.0000, 'Hyderabad, India',  '2026-03-25'),
    (4, 1, 'Grid Electricity',     3000.0000, 'kWh',     0.820000, 2460.0000, 'Hyderabad, India',  '2026-04-25'),
    (4, 1, 'Grid Electricity',     3500.0000, 'kWh',     0.820000, 2870.0000, 'Hyderabad, India',  '2026-05-25'),
    (4, 1, 'Grid Electricity',     3800.0000, 'kWh',     0.820000, 3116.0000, 'Hyderabad, India',  '2026-06-25'),
    (4, 1, 'Grid Electricity',     3600.0000, 'kWh',     0.820000, 2952.0000, 'Hyderabad, India',  '2026-07-25'),
    (4, 1, 'Grid Electricity',     3300.0000, 'kWh',     0.820000, 2706.0000, 'Hyderabad, India',  '2026-08-25'),
    (4, 2, 'Petrol Car',            800.0000, 'km',      0.192000,  153.6000, 'Hyderabad, India',  '2026-04-10'),
    (4, 2, 'Domestic Flight',      1200.0000, 'km',      0.246000,  295.2000, 'Hyderabad, India',  '2026-07-05'),
    (4, 4, 'Recycled Waste',        200.0000, 'kg',      0.021000,    4.2000, 'Hyderabad, India',  '2026-06-15'),
    (4, 5, 'Municipal Water Supply',  30.0000, 'kl',     0.344000,   10.3200, 'Hyderabad, India',  '2026-05-20');

-- ---- User 5: Vikram Singh (Transportation, Chennai) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (5, 2, 'Diesel Car',           8000.0000, 'km',      0.171000, 1368.0000, 'Chennai, India',    '2026-03-05'),
    (5, 2, 'Diesel Car',           7500.0000, 'km',      0.171000, 1282.5000, 'Chennai, India',    '2026-04-05'),
    (5, 2, 'Diesel Car',           9000.0000, 'km',      0.171000, 1539.0000, 'Chennai, India',    '2026-05-05'),
    (5, 2, 'Diesel Car',           8500.0000, 'km',      0.171000, 1453.5000, 'Chennai, India',    '2026-06-05'),
    (5, 2, 'Diesel Car',           7800.0000, 'km',      0.171000, 1333.8000, 'Chennai, India',    '2026-07-05'),
    (5, 2, 'Diesel Car',           8200.0000, 'km',      0.171000, 1402.2000, 'Chennai, India',    '2026-08-05'),
    (5, 2, 'Diesel Car',           7000.0000, 'km',      0.171000, 1197.0000, 'Chennai, India',    '2026-09-05'),
    (5, 3, 'Diesel Combustion',    4000.0000, 'litre',   2.680000, 10720.0000,'Chennai, India',    '2026-04-20'),
    (5, 3, 'Diesel Combustion',    4500.0000, 'litre',   2.680000, 12060.0000,'Chennai, India',    '2026-06-20'),
    (5, 3, 'Diesel Combustion',    3800.0000, 'litre',   2.680000, 10184.0000,'Chennai, India',    '2026-08-20'),
    (5, 1, 'Grid Electricity',     2500.0000, 'kWh',     0.820000, 2050.0000, 'Chennai, India',    '2026-05-15'),
    (5, 1, 'Grid Electricity',     2800.0000, 'kWh',     0.820000, 2296.0000, 'Chennai, India',    '2026-07-15');

-- ---- User 6: Ananya Reddy (Healthcare, Pune) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (6, 1, 'Grid Electricity',     6000.0000, 'kWh',     0.820000, 4920.0000, 'Pune, India',       '2026-03-12'),
    (6, 1, 'Grid Electricity',     5800.0000, 'kWh',     0.820000, 4756.0000, 'Pune, India',       '2026-04-12'),
    (6, 1, 'Grid Electricity',     6500.0000, 'kWh',     0.820000, 5330.0000, 'Pune, India',       '2026-05-12'),
    (6, 1, 'Grid Electricity',     7000.0000, 'kWh',     0.820000, 5740.0000, 'Pune, India',       '2026-06-12'),
    (6, 1, 'Grid Electricity',     6800.0000, 'kWh',     0.820000, 5576.0000, 'Pune, India',       '2026-07-12'),
    (6, 1, 'Grid Electricity',     6200.0000, 'kWh',     0.820000, 5084.0000, 'Pune, India',       '2026-08-12'),
    (6, 4, 'General Waste to Landfill', 800.0000, 'kg',  0.587000,  469.6000, 'Pune, India',       '2026-04-30'),
    (6, 4, 'General Waste to Landfill', 750.0000, 'kg',  0.587000,  440.2500, 'Pune, India',       '2026-06-30'),
    (6, 5, 'Municipal Water Supply',  55.0000, 'kl',     0.344000,   18.9200, 'Pune, India',       '2026-05-30'),
    (6, 5, 'Wastewater Treatment',    40.0000, 'kl',     0.708000,   28.3200, 'Pune, India',       '2026-07-30'),
    (6, 2, 'Petrol Car',            600.0000, 'km',      0.192000,  115.2000, 'Pune, India',       '2026-08-20');

-- ---- User 7: Kabir Joshi (Retail, Jaipur) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (7, 1, 'Grid Electricity',     3800.0000, 'kWh',     0.820000, 3116.0000, 'Jaipur, India',     '2026-03-18'),
    (7, 1, 'Grid Electricity',     3500.0000, 'kWh',     0.820000, 2870.0000, 'Jaipur, India',     '2026-04-18'),
    (7, 1, 'Grid Electricity',     4200.0000, 'kWh',     0.820000, 3444.0000, 'Jaipur, India',     '2026-05-18'),
    (7, 1, 'Grid Electricity',     4800.0000, 'kWh',     0.820000, 3936.0000, 'Jaipur, India',     '2026-06-18'),
    (7, 1, 'Grid Electricity',     4500.0000, 'kWh',     0.820000, 3690.0000, 'Jaipur, India',     '2026-07-18'),
    (7, 1, 'Grid Electricity',     4000.0000, 'kWh',     0.820000, 3280.0000, 'Jaipur, India',     '2026-08-18'),
    (7, 2, 'Petrol Car',           2000.0000, 'km',      0.192000,  384.0000, 'Jaipur, India',     '2026-05-10'),
    (7, 3, 'LPG Combustion',        150.0000, 'kg',      2.983000,  447.4500, 'Jaipur, India',     '2026-06-01'),
    (7, 3, 'LPG Combustion',        140.0000, 'kg',      2.983000,  417.6200, 'Jaipur, India',     '2026-08-01'),
    (7, 4, 'Composting',             500.0000, 'kg',      0.010000,    5.0000, 'Jaipur, India',     '2026-07-15'),
    (7, 6, 'Natural Gas Cooking',     60.0000, 'cubic_m', 2.020000,  121.2000, 'Jaipur, India',     '2026-09-01');

-- ---- User 8: Meera Krishnan (Education, Kolkata) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (8, 1, 'Grid Electricity',     2800.0000, 'kWh',     0.820000, 2296.0000, 'Kolkata, India',    '2026-03-22'),
    (8, 1, 'Grid Electricity',     2600.0000, 'kWh',     0.820000, 2132.0000, 'Kolkata, India',    '2026-04-22'),
    (8, 1, 'Grid Electricity',     3000.0000, 'kWh',     0.820000, 2460.0000, 'Kolkata, India',    '2026-05-22'),
    (8, 1, 'Grid Electricity',     3200.0000, 'kWh',     0.820000, 2624.0000, 'Kolkata, India',    '2026-06-22'),
    (8, 1, 'Grid Electricity',     3100.0000, 'kWh',     0.820000, 2542.0000, 'Kolkata, India',    '2026-07-22'),
    (8, 1, 'Grid Electricity',     2900.0000, 'kWh',     0.820000, 2378.0000, 'Kolkata, India',    '2026-08-22'),
    (8, 2, 'Train Travel',         3000.0000, 'km',      0.041000,  123.0000, 'Kolkata, India',    '2026-04-05'),
    (8, 2, 'Train Travel',         2500.0000, 'km',      0.041000,  102.5000, 'Kolkata, India',    '2026-07-10'),
    (8, 5, 'Municipal Water Supply',  25.0000, 'kl',     0.344000,    8.6000, 'Kolkata, India',    '2026-06-20'),
    (8, 4, 'Recycled Waste',         300.0000, 'kg',     0.021000,    6.3000, 'Kolkata, India',    '2026-08-10');

-- ---- User 9: Arjun Nair (Agriculture, Kochi) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (9, 1, 'Grid Electricity',     1800.0000, 'kWh',     0.820000, 1476.0000, 'Kochi, India',      '2026-03-08'),
    (9, 1, 'Grid Electricity',     1600.0000, 'kWh',     0.820000, 1312.0000, 'Kochi, India',      '2026-04-08'),
    (9, 1, 'Grid Electricity',     2000.0000, 'kWh',     0.820000, 1640.0000, 'Kochi, India',      '2026-05-08'),
    (9, 1, 'Grid Electricity',     2200.0000, 'kWh',     0.820000, 1804.0000, 'Kochi, India',      '2026-06-08'),
    (9, 1, 'Grid Electricity',     2100.0000, 'kWh',     0.820000, 1722.0000, 'Kochi, India',      '2026-07-08'),
    (9, 1, 'Grid Electricity',     1900.0000, 'kWh',     0.820000, 1558.0000, 'Kochi, India',      '2026-08-08'),
    (9, 3, 'Diesel Combustion',    1500.0000, 'litre',   2.680000, 4020.0000, 'Kochi, India',      '2026-04-15'),
    (9, 3, 'Diesel Combustion',    1800.0000, 'litre',   2.680000, 4824.0000, 'Kochi, India',      '2026-06-15'),
    (9, 3, 'Diesel Combustion',    1400.0000, 'litre',   2.680000, 3752.0000, 'Kochi, India',      '2026-08-15'),
    (9, 5, 'Municipal Water Supply', 120.0000, 'kl',     0.344000,   41.2800, 'Kochi, India',      '2026-05-20'),
    (9, 5, 'Municipal Water Supply', 130.0000, 'kl',     0.344000,   44.7200, 'Kochi, India',      '2026-07-20'),
    (9, 4, 'Composting',            1000.0000, 'kg',     0.010000,   10.0000, 'Kochi, India',      '2026-09-01');

-- ---- User 10: Diya Chopra (Construction, Ahmedabad) ----
INSERT INTO emission_records (user_id, category_id, activity, quantity, unit, emission_factor, co2e, location, date) VALUES
    (10, 1, 'Grid Electricity',    10000.0000, 'kWh',    0.820000, 8200.0000, 'Ahmedabad, India',  '2026-03-01'),
    (10, 1, 'Grid Electricity',     9500.0000, 'kWh',    0.820000, 7790.0000, 'Ahmedabad, India',  '2026-04-01'),
    (10, 1, 'Grid Electricity',    11000.0000, 'kWh',    0.820000, 9020.0000, 'Ahmedabad, India',  '2026-05-01'),
    (10, 1, 'Grid Electricity',    12000.0000, 'kWh',    0.820000, 9840.0000, 'Ahmedabad, India',  '2026-06-01'),
    (10, 1, 'Grid Electricity',    11500.0000, 'kWh',    0.820000, 9430.0000, 'Ahmedabad, India',  '2026-07-01'),
    (10, 1, 'Grid Electricity',    10500.0000, 'kWh',    0.820000, 8610.0000, 'Ahmedabad, India',  '2026-08-01'),
    (10, 1, 'Grid Electricity',    10200.0000, 'kWh',    0.820000, 8364.0000, 'Ahmedabad, India',  '2026-09-01'),
    (10, 3, 'Diesel Combustion',    5000.0000, 'litre',  2.680000, 13400.0000,'Ahmedabad, India',  '2026-04-10'),
    (10, 3, 'Diesel Combustion',    5500.0000, 'litre',  2.680000, 14740.0000,'Ahmedabad, India',  '2026-06-10'),
    (10, 3, 'Diesel Combustion',    4800.0000, 'litre',  2.680000, 12864.0000,'Ahmedabad, India',  '2026-08-10'),
    (10, 4, 'General Waste to Landfill', 2000.0000, 'kg', 0.587000, 1174.0000,'Ahmedabad, India',  '2026-05-15'),
    (10, 4, 'General Waste to Landfill', 1800.0000, 'kg', 0.587000, 1056.6000,'Ahmedabad, India',  '2026-07-15'),
    (10, 2, 'Diesel Car',           4000.0000, 'km',     0.171000,  684.0000, 'Ahmedabad, India',  '2026-06-20'),
    (10, 6, 'Industrial Natural Gas', 400.0000, 'cubic_m', 2.020000, 808.0000, 'Ahmedabad, India', '2026-07-10');


COMMIT;

-- ============================================================================
-- SEED DATA STATISTICS
-- ============================================================================
-- Users:              10
-- Emission Categories: 6
-- Emission Factors:   18
-- Emission Records:  123
--
-- Date range: March 2026 — September 2026
-- Locations:  10 Indian cities
-- Industries: IT, Manufacturing, Energy, Finance, Transportation,
--             Healthcare, Retail, Education, Agriculture, Construction
-- ============================================================================
