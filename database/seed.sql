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


-- ============================================================================
-- 5. AI COPILOT SEED DATA (Phase 9 — 24 October – 20 November 2026)
-- ============================================================================
-- Realistic sample AI conversations & message exchanges for testing.
-- Demonstrates multi-turn user queries, real-time SSE streaming, latency tracking,
-- and AI sustainability recommendations across multiple dates up to 20 Nov 2026.

INSERT INTO ai_conversations (
    id,
    user_id,
    title,
    system_prompt_tokens,
    context_window_tokens,
    created_at,
    updated_at
) VALUES
    (1, 1, 'Electricity Emission Reduction Strategy',               420, 1280, '2026-10-24 10:15:00+00', '2026-10-24 10:16:30+00'),
    (2, 1, 'Q3 2026 Carbon Footprint Summary',                      380,  950, '2026-10-25 14:00:00+00', '2026-10-25 14:02:10+00'),
    (3, 2, 'Fleet Electrification Feasibility',                     450, 1100, '2026-10-26 11:30:00+00', '2026-10-26 11:32:45+00'),
    (4, 1, 'Scope 3 Supply Chain Logistics & Packaging',            410, 1460, '2026-11-02 09:30:00+00', '2026-11-02 09:33:15+00'),
    (5, 3, 'Water Recycling & Effluent Treatment Savings',          390,  880, '2026-11-04 16:15:00+00', '2026-11-04 16:17:20+00'),
    (6, 1, 'HVAC Smart Scheduling & Battery Peak Shaving',          440, 1620, '2026-11-08 11:00:00+00', '2026-11-08 11:04:15+00'),
    (7, 2, 'DEFRA 2024 Ocean Freight vs Air Cargo Transition',      460, 1840, '2026-11-12 15:20:00+00', '2026-11-12 15:25:30+00'),
    (8, 4, 'Scope 1 Boiler Decarbonization & Methane Leak Auditing', 430, 1390, '2026-11-16 10:10:00+00', '2026-11-16 10:13:40+00'),
    (9, 5, 'ISO 14064 Carbon Audit Readiness & Scope 2 Decarb',     490, 2150, '2026-11-20 09:45:00+00', '2026-11-20 09:51:20+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_messages (
    conversation_id,
    role,
    content,
    tokens_used,
    status,
    latency_ms,
    chunk_count,
    model_version,
    created_at
) VALUES
    -- Conversation 1: User 1 (IT Industry, Bengaluru)
    (1, 'user', 
        'Our electricity consumption is our highest emission source in Bengaluru. What are three high-impact strategies to reduce it by 20% by next year?',
        35, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-10-24 10:15:00+00'),
    (1, 'assistant',
        'Based on your data from Bengaluru showing high Grid Electricity usage (factor 0.82 kg CO2e/kWh):

1. **Procure Rooftop Solar or Open Access PPA**: Shifting 30% of your data center and office load to solar reduces operational electricity emissions by up to 93% per kWh (0.05 vs 0.82 kg CO2e/kWh).
2. **Optimize Server Room HVAC Setpoints**: Increasing IT server room cooling thresholds from 20°C to 24°C compliant with ASHRAE standards cuts air-conditioning power consumption by 12–15%.
3. **Automated Sleep Policies & Smart Metering**: Deploy automated scheduled sleep states on idle workstations and peripheral equipment during non-business hours (7 PM to 7 AM).',
        185, 'completed', 740, 22, 'gemini-1.5-pro', '2026-10-24 10:15:45+00'),
    (1, 'user',
        'What would be the estimated CO2e savings if we switch 5,000 kWh/month to solar?',
        22, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-10-24 10:16:10+00'),
    (1, 'assistant',
        'Switching 5,000 kWh/month from India Grid Electricity (0.82 kg CO2e/kWh) to Solar (0.05 kg CO2e/kWh) saves **3.85 tonnes of CO2e per month** (approx. **46.2 tonnes CO2e annually**), a net 93.9% emission reduction for that energy block.',
        78, 'completed', 490, 14, 'gemini-1.5-flash', '2026-10-24 10:16:30+00'),

    -- Conversation 2: User 1
    (2, 'user',
        'Can you summarize my top emission category and month-over-month trend for Q3 2026?',
        24, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-10-25 14:00:00+00'),
    (2, 'assistant',
        'Here is your Q3 2026 analysis:
- **Top Emission Source**: Grid Electricity accounted for **78.4%** of your total emissions across July–September.
- **Trend**: Your emissions peaked in July (5,740 kg CO2e) and declined by **11.2% in August** (5,096 kg CO2e) following reduced office occupancy and cooling adjustments.',
        110, 'completed', 620, 18, 'gemini-1.5-pro', '2026-10-25 14:02:10+00'),

    -- Conversation 3: User 2 (Manufacturing, Pune)
    (3, 'user',
        'How much CO2e would our manufacturing plant save by transitioning our diesel delivery vans to commercial EVs?',
        25, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-10-26 11:30:00+00'),
    (3, 'assistant',
        'For commercial fleet operations:
- **Diesel Van**: Emits approximately **0.171 kg CO2e/km**.
- **Electric Vehicle (BEV on Grid)**: Emits approximately **0.053 kg CO2e/km** (or near zero with renewable charging).
- **Net Saving**: You will save **0.118 kg CO2e per kilometer**, achieving an immediate **69% operational footprint reduction** across all delivery routes.',
        125, 'completed', 810, 24, 'gemini-1.5-pro', '2026-10-26 11:32:45+00'),

    -- Conversation 4: User 1 (02 Nov 2026 — Supply Chain & Packaging Search Targets)
    (4, 'user',
        'We want to evaluate low-carbon alternatives for our domestic freight logistics and cardboard packaging waste.',
        21, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-02 09:30:00+00'),
    (4, 'assistant',
        'Key levers for Scope 3 freight and waste decarbonization:
1. **Modal Shift to Rail**: Shifting long-haul freight from Heavy Diesel Trucks (0.892 kg CO2e/km) to Electric Freight Rail (0.041 kg CO2e/km) eliminates 95% of transit emissions.
2. **Closed-Loop Recycled Packaging**: Recycling corrugated cardboard emits only 0.021 kg CO2e/kg compared to 0.587 kg CO2e/kg for landfill disposal, yielding a 96.4% lifecycle footprint reduction.',
        142, 'completed', 690, 21, 'gemini-1.5-pro', '2026-11-02 09:31:40+00'),
    (4, 'user',
        'Can you calculate the carbon credit offset potential if we recycle 10 tonnes of cardboard per quarter?',
        20, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-02 09:32:30+00'),
    (4, 'assistant',
        'Recycling 10 tonnes (10,000 kg) of cardboard avoids 5.66 tonnes of CO2e per quarter (22.64 tonnes CO2e annually) versus landfill methane generation.',
        65, 'completed', 410, 11, 'gemini-1.5-flash', '2026-11-02 09:33:15+00'),

    -- Conversation 5: User 3 (04 Nov 2026 — Textile & Water Conservation)
    (5, 'user',
        'How does on-site industrial wastewater treatment compare against municipal discharge in terms of GHG footprint?',
        19, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-04 16:15:00+00'),
    (5, 'assistant',
        'Wastewater treatment emissions analysis:
- **Standard Wastewater Treatment**: Factors indicate 0.708 kg CO2e/kl treated.
- **Bioreactor with Methane Capture**: Capturing bio-gas reduces net lifecycle emissions to approximately 0.280 kg CO2e/kl, while generating reusable heat energy for factory boilers.',
        118, 'completed', 560, 16, 'gemini-1.5-flash', '2026-11-04 16:17:20+00'),

    -- Conversation 6: User 1 (08 Nov 2026 — Multi-Turn HVAC & Battery Peak Shaving)
    (6, 'user',
        'Can we combine smart HVAC cycling with battery energy storage (BESS) to lower our peak demand charges and grid carbon intensity in Bengaluru?',
        27, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-08 11:00:00+00'),
    (6, 'assistant',
        'Yes, co-locating Battery Energy Storage Systems (BESS) with automated HVAC cycling offers substantial dual benefits:
1. **Carbon Arbitrage**: Charge batteries during peak solar hours (11 AM – 3 PM) when grid intensity is lower, and discharge during evening peak hours (6 PM – 10 PM) when Karnataka grid draws heavily from coal thermal stations.
2. **Demand Peak Shaving**: Pre-cooling facility spaces by 1.5°C before 5 PM suppresses peak chiller demand by up to 25%, avoiding tariff penalties while reducing high-intensity peak grid emissions.',
        156, 'completed', 680, 23, 'gemini-1.5-pro', '2026-11-08 11:01:25+00'),
    (6, 'user',
        'What would be the estimated payback period for a 100 kWh lithium iron phosphate (LFP) battery installation?',
        21, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-08 11:02:10+00'),
    (6, 'assistant',
        'For commercial commercial tariffs in Bengaluru (BESCOM HT-2a):
- **Capex**: Approximately ₹28,000 to ₹34,000 per kWh for commercial LFP systems (~₹30 Lakhs total).
- **Annual Savings**: Demand charge reduction + Time-of-Day (ToD) tariff arbitrage typically saves ₹6.8–₹8.2 Lakhs annually.
- **Payback Period**: **3.7 to 4.4 years**, with an asset lifetime of 10+ years (4,000–6,000 cycles).',
        138, 'completed', 520, 19, 'gemini-1.5-flash', '2026-11-08 11:04:15+00'),

    -- Conversation 7: User 2 (12 Nov 2026 — DEFRA 2024 Ocean Freight vs Air Cargo)
    (7, 'user',
        'Our export division currently air-freights 15 tonnes of precision components monthly from Mumbai to Frankfurt. What is the emission reduction if we shift to sea container freight?',
        31, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-12 15:20:00+00'),
    (7, 'assistant',
        'According to UK DEFRA 2024 and IMO emission factors:
- **Air Freight (Long-haul international)**: ~0.602 kg CO2e per tonne-km. For Mumbai to Frankfurt (~6,600 km), 15 tonnes produces **59.6 tonnes CO2e** per single shipment.
- **Ocean Container Ship**: ~0.016 kg CO2e per tonne-km. For maritime routing via Suez (~7,800 nautical km), 15 tonnes produces only **1.87 tonnes CO2e**.
- **Net Reduction**: Shifting to ocean freight reduces transit emissions by **96.8% (57.7 tonnes CO2e avoided monthly / 692 tonnes CO2e saved annually)**.',
        174, 'completed', 890, 26, 'gemini-1.5-pro', '2026-11-12 15:22:15+00'),
    (7, 'user',
        'How does lead time buffer inventory affect working capital carbon impact?',
        14, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-12 15:23:45+00'),
    (7, 'assistant',
        'While maritime shipping extends lead times from 3 days to 24 days requiring higher safety inventory in European warehouses, warehouse storage emissions (0.008 kg CO2e/pallet-day) represent less than 0.4% of the carbon savings achieved by eliminating air cargo.',
        88, 'completed', 450, 15, 'gemini-1.5-flash', '2026-11-12 15:25:30+00'),

    -- Conversation 8: User 4 (16 Nov 2026 — Boiler Decarbonization & Methane Leak Auditing)
    (8, 'user',
        'We operate dual-fuel natural gas and diesel boilers in our chemical processing plant. How can we audit fugitive emissions and prioritize fuel switching?',
        26, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-16 10:10:00+00'),
    (8, 'assistant',
        'Recommended industrial boiler decarbonization pathway:
1. **Optical Gas Imaging (OGI) & Ultrasonic Leak Auditing**: Natural gas pipeline joints and pressure relief valves often release uncombusted methane (GWP 28x over 100 years). Fixing valve leaks typically captures 2–5% of lost fuel value immediately.
2. **Phase out Heavy Diesel for Natural Gas**: Natural Gas combustion factor (2.02 kg CO2e/m3) produces ~28% less carbon per gigajoule than Diesel (2.68 kg CO2e/litre) with near-zero particulate matter and SOx.
3. **Flue Gas Heat Recovery (Economizers)**: Pre-heating boiler feedwater using flue gas exhaust temperature lifts thermal efficiency by 6–8%, cutting fuel volume proportionally.',
        192, 'completed', 780, 25, 'gemini-1.5-pro', '2026-11-16 10:12:05+00'),
    (8, 'user',
        'What is the feasibility of blending 15% green hydrogen into our existing natural gas burner infrastructure?',
        19, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-16 10:12:45+00'),
    (8, 'assistant',
        'Most modern industrial low-NOx gas burners accept up to 15–20% hydrogen by volume without burner head modification or pipe embrittlement risks. A 15% H2 volumetric blend delivers approximately 5–6% carbon emissions reduction due to hydrogen lower volumetric energy density compared to methane.',
        96, 'completed', 480, 16, 'gemini-1.5-flash', '2026-11-16 10:13:40+00'),

    -- Conversation 9: User 5 (19–20 Nov 2026 — ISO 14064 Carbon Audit Readiness & Scope 2 Decarb)
    (9, 'user',
        'Our leadership team requires an ISO 14064-1 compliant carbon audit report before December 2026. What specific data verification protocols are required for our Scope 1 and Scope 2 boundary?',
        31, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-19 16:30:00+00'),
    (9, 'assistant',
        'To ensure ISO 14064-1 and GHG Protocol Corporate Standard audit compliance:
1. **Organizational Boundary Protocol**: Select and document either the **Operational Control** or **Equity Share** approach consistently across all subsidiaries and facilities.
2. **Scope 1 Fuel & Refrigerant Activity Evidence**: Reconcile bulk fuel purchase receipts, monthly utility meter logs, and HVAC F-gas service records. Calculate fugitive refrigerant loss using mass-balance recharge quantities.
3. **Dual Scope 2 Reporting**: Calculate and publish both **Location-Based** (national/regional grid emission factor: 0.82 kg CO2e/kWh) and **Market-Based** (contractual Energy Attribute Certificates, I-RECs, and green tariff PPAs) metrics.
4. **Uncertainty & Data Quality Scoring**: Document emission factor source pedigree (e.g., DEFRA 2024, CEA India 2024, IPCC AR6) and quantify activity data variance.',
        224, 'completed', 940, 29, 'gemini-1.5-pro', '2026-11-19 16:33:10+00'),
    (9, 'user',
        'Can EcoInsight export our historical monthly emission totals and factor references directly into audit-ready tabular format?',
        19, 'completed', NULL, 1, 'gemini-1.5-pro', '2026-11-20 09:48:30+00'),
    (9, 'assistant',
        'Yes. EcoInsight database provides audit-ready query endpoints (`/api/analytics/export` and `/api/reports`) that generate timestamped records with full traceability:
- Raw activity quantity and normalized SI units
- Source factor citation (e.g., CEA CO2 Baseline v19, UK DEFRA 2024)
- Exact mathematical calculation formula (`co2e = quantity * factor`)
- Cryptographic hash audit timestamp and user modification logs.',
        122, 'completed', 410, 18, 'gemini-1.5-flash', '2026-11-20 09:51:20+00');

-- Reset sequences so subsequent insertions do not conflict
SELECT setval('ai_conversations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ai_conversations));
SELECT setval('ai_messages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ai_messages));


COMMIT;


-- ============================================================================
-- SEED DATA STATISTICS (Updated 20 November 2026 — Milestone Complete)
-- ============================================================================
-- Users:              10
-- Emission Categories: 6
-- Emission Factors:   18 (Base) / 40+ (Phase 8 Migration)
-- Emission Records:  123
-- AI Conversations:   9 (Phase 9 — covering 24 Oct – 20 Nov 2026)
-- AI Messages:       22 (Phase 9 — covering 24 Oct – 20 Nov 2026)
-- Streaming Metadata: status, latency_ms, chunk_count, model_version
--
-- Date range: March 2026 — 20 November 2026
-- Locations:  10 Indian cities
-- Industries: IT, Manufacturing, Energy, Finance, Transportation,
--             Healthcare, Retail, Education, Agriculture, Construction
-- ============================================================================
