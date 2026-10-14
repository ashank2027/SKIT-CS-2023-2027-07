-- ============================================================================
-- ECOINSIGHT — Migration 002: Phase 8 Calculator & CSV Expansion
-- ============================================================================
-- Author:  Bhavya Chautharamani
-- Date:    08 October 2026
-- Phase:   Phase 8 — Calculator + CSV + Advanced Analytics (27 Sep – 23 Oct)
--
-- Description:
--   1. Expands `emission_factors` table with comprehensive conversion factors
--      across Electricity, Transportation, Fuel, Waste, Water, and Natural Gas
--      covering metric and imperial units (kWh, MWh, km, mile, litre, gallon,
--      kg, tonne, kl, cubic_m, therm).
--   2. Adds case-insensitive lookup index on emission_factors for fast API
--      and CSV batch matching.
--   3. Adds performance indexes for CSV batch record lookups and bulk imports.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. INDEX OPTIMIZATIONS FOR CSV MATCHING & CALCULATOR LOOKUPS
-- ----------------------------------------------------------------------------

-- Fast case-insensitive activity and unit lookup index
CREATE INDEX IF NOT EXISTS idx_emission_factors_lower_activity_unit 
    ON emission_factors (category_id, LOWER(activity), LOWER(unit));

-- Fast lookup index for CSV user/date batch insertions
CREATE INDEX IF NOT EXISTS idx_emission_records_user_date_category 
    ON emission_records (user_id, date, category_id);


-- ----------------------------------------------------------------------------
-- 2. EXPANDED EMISSION FACTORS DATASET
-- ----------------------------------------------------------------------------
-- Standard conversion values compiled from EPA WARM v15, UK DEFRA 2024/2026,
-- IPCC AR6, and CEA India CO2 Baseline Database.
-- Uses ON CONFLICT (category_id, activity, unit) DO UPDATE to prevent errors.

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

ON CONFLICT (category_id, activity, unit) 
DO UPDATE SET 
    factor = EXCLUDED.factor,
    source = EXCLUDED.source,
    updated_at = NOW();

COMMIT;

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================
