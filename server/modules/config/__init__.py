import os
MARS_CORRECTION = 0.0163
VIM_YEAR = 365.242198781
SECONDS_IN_YEAR = VIM_YEAR * 86400
NAK_DEG = 13.333333333333
TOTAL_VIMSHOTTARI = 120
CYCLE_SECONDS = TOTAL_VIMSHOTTARI * SECONDS_IN_YEAR

NAKSHATRA_NAMES = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha","Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha","Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"]
ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
NAK_LORDS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"]

PLANET_INFO = {
   'Sun': {'icon': '☉', 'color': '#FFD700', 'swe': 0, 'size': 30, 'orbit': 0},
   'Moon': {'icon': '☽', 'color': '#C0C0C0', 'swe': 1, 'size': 12, 'orbit': 60},
   'Mercury': {'icon': '☿', 'color': '#FFA500', 'swe': 2, 'size': 10, 'orbit': 90},
   'Venus': {'icon': '♀', 'color': '#FF69B4', 'swe': 3, 'size': 14, 'orbit': 120},
   'Mars': {'icon': '♂', 'color': '#FF4500', 'swe': 4, 'size': 16, 'orbit': 150},
   'Jupiter': {'icon': '♃', 'color': '#DAA520', 'swe': 5, 'size': 24, 'orbit': 200},
   'Saturn': {'icon': '♄', 'color': '#F4A460', 'swe': 6, 'size': 22, 'orbit': 260},
   'Rahu': {'icon': '☊', 'color': '#9932CC', 'swe': 10, 'size': 12, 'orbit': 320},
   'Ketu': {'icon': '☋', 'color': '#708090', 'swe': None, 'size': 12, 'orbit': 320}
}

SAPT_NADI_MAP = {
   0: ["Krittika", "Vishakha", "Anuradha", "Bharani"],
   1: ["Rohini", "Swati", "Jyeshtha", "Ashwini"],
   2: ["Mrigashira", "Chitra", "Mula", "Revati"],
   3: ["Ardra", "Hasta", "Purva Ashadha", "Uttara Bhadrapada"],
   4: ["Punarvasu", "Uttara Phalguni", "Uttara Ashadha", "Purva Bhadrapada"],
   5: ["Pushya", "Purva Phalguni", "Abhijit", "Shatabhisha"],
   6: ["Ashlesha", "Magha", "Shravana", "Dhanishta"]
}

MANDAL_MAP = {
   'Agni': ["Pushya", "Bharani", "Krittika", "Magha", "Purva Phalguni", "Purva Bhadrapada", "Vishakha"],
   'Vayu': ["Ashwini", "Mrigashira", "Punarvasu", "Uttara Phalguni", "Hasta", "Chitra", "Swati"],
   'Varuna': ["Ardra", "Ashlesha", "Mula", "Purva Ashadha", "Uttara Bhadrapada", "Revati"],
   'Mahendra': ["Rohini", "Anuradha", "Jyeshtha", "Uttara Ashadha", "Abhijit", "Shravana", "Dhanishta"]
}

DUAR_MAP = {
   'Megh Duar': {'nakshatras': ["Pushya", "Bharani", "Rohini", "Krittika", "Mrigashira", "Ardra", "Punarvasu", "Ashlesha"], 'color': '#87ceeb'},
   'Vayu Duar': {'nakshatras': ["Chitra", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta"], 'color': '#ff4d4d'},
   'Dharam Duar': {'nakshatras': ["Swati", "Vishakha", "Anuradha"], 'color': '#ffd700'},
   'Ret Duar': {'nakshatras': ["Purva Ashadha", "Mula", "Jyeshtha", "Uttara Ashadha", "Shravana", "Abhijit"], 'color': '#1e90ff'},
   'Hem Duar': {'nakshatras': ["Uttara Bhadrapada", "Revati", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Ashlesha"], 'color': '#9932cc'}
}

DASHA_YEARS = {
   'Ketu': 7,
   'Venus': 20,
   'Sun': 6,
   'Moon': 10,
   'Mars': 7,
   'Rahu': 18,
   'Jupiter': 16,
   'Saturn': 19,
   'Mercury': 17
}

USERNAME = "Prakash"
PASSWORD = "12345"

ARTICLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "client", "templates", "article")
ADDITIONAL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "content", "durgaa-shapatshati")
