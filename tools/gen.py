#!/usr/bin/env python3
# mehndi-design-bd -- generates js/data.js and js/i18n.js (pure ASCII output;
# Bengali text emitted as \uXXXX escapes via json.dumps(ensure_ascii=True)).
# All 12 designs are ORIGINAL SVG artwork drawn in code (stylised hand/foot
# + henna motifs). No copied images, no external assets.
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "js")

H = "#7a2e0d"   # dark henna
A = "#a34d1c"   # henna accent
SKIN = "#f9e8cf"
OUTLINE = "#8a4b1f"

def j(v):
    return json.dumps(v, ensure_ascii=True)

# ---------- SVG primitives ----------
def circle(cx, cy, r, fill="none", stroke=H, sw=1.6):
    return '<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (cx, cy, r, fill, stroke, sw)

def dot(cx, cy, r=2.2, fill=H):
    return '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (cx, cy, r, fill)

def petal(cx, cy, rx, ry, angle, fill="none"):
    return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" stroke="%s" stroke-width="1.5" transform="rotate(%s %s %s)"/>' % (cx, cy, rx, ry, fill, H, angle, cx, cy)

def flower(cx, cy, r, petals=6, fill="none"):
    out = []
    for i in range(petals):
        a = i * 360 / petals
        # petal ellipse centred offset from centre, rotated
        px = cx
        py = cy - r * 0.62
        out.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" stroke="%s" stroke-width="1.5" transform="rotate(%s %s %s)"/>' % (px, round(py, 1), round(r * 0.34, 1), round(r * 0.62, 1), fill, H, a, cx, cy))
    out.append(dot(cx, cy, max(2.2, r * 0.18)))
    return "".join(out)

def mandala(cx, cy, r):
    out = [circle(cx, cy, r), circle(cx, cy, round(r * 0.62, 1), stroke=A)]
    for i in range(8):
        a = i * 45
        out.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="none" stroke="%s" stroke-width="1.4" transform="rotate(%s %s %s)"/>' % (cx, round(cy - r * 0.62, 1), round(r * 0.2, 1), round(r * 0.42, 1), H, a, cx, cy))
    out.append(circle(cx, cy, round(r * 0.28, 1), stroke=A))
    out.append(dot(cx, cy, max(2, r * 0.09)))
    for i in range(8):
        import math
        a = math.radians(i * 45 + 22.5)
        out.append(dot(round(cx + r * 0.82 * math.cos(a), 1), round(cy + r * 0.82 * math.sin(a), 1), 1.8))
    return "".join(out)

def paisley(cx, cy, s, rot=0):
    # teardrop body + inner curl + dot
    p = ('<g transform="translate(%s %s) rotate(%s) scale(%s)">'
         '<path d="M0 -1 C0.85 -0.6 0.85 0.55 0 1 C-0.85 0.55 -0.85 -0.6 0 -1 Z" fill="none" stroke="%s" stroke-width="0.09"/>'
         '<path d="M0 -0.55 C0.45 -0.3 0.45 0.35 0 0.6 C-0.3 0.4 -0.35 -0.1 0 -0.25" fill="none" stroke="%s" stroke-width="0.07"/>'
         '<circle cx="0" cy="0.05" r="0.1" fill="%s"/></g>') % (cx, cy, rot, s, H, A, H)
    return p

def vine(x1, y1, x2, y2, leaves=True):
    mx = (x1 + x2) / 2 + 12
    my = (y1 + y2) / 2
    out = ['<path d="M%s %s Q%s %s %s %s" fill="none" stroke="%s" stroke-width="1.6"/>' % (x1, y1, mx, my, x2, y2, H)]
    if leaves:
        for t in (0.3, 0.55, 0.8):
            lx = round(x1 + (x2 - x1) * t, 1)
            ly = round(y1 + (y2 - y1) * t, 1)
            out.append('<ellipse cx="%s" cy="%s" rx="6" ry="2.6" fill="none" stroke="%s" stroke-width="1.3" transform="rotate(-35 %s %s)"/>' % (lx, ly, A, lx, ly))
    return "".join(out)

def dots_row(x1, x2, y, n, r=2):
    out = []
    for i in range(n):
        x = x1 + (x2 - x1) * i / max(1, n - 1)
        out.append(dot(round(x, 1), y, r))
    return "".join(out)

def band(y, x1=64, x2=136):
    # decorative horizontal band with triangles
    out = ['<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.6"/>' % (x1, y, x2, y, H),
           '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="1.4"/>' % (x1, y + 8, x2, y + 8, A)]
    for i in range(5):
        x = x1 + 8 + i * (x2 - x1 - 16) / 4
        out.append('<path d="M%s %s l4 7 l4 -7 Z" fill="%s"/>' % (round(x, 1), y + 2, H))
    return "".join(out)

def arc(cx, cy, r, a0, a1):
    import math
    x0 = round(cx + r * math.cos(math.radians(a0)), 1)
    y0 = round(cy + r * math.sin(math.radians(a0)), 1)
    x1 = round(cx + r * math.cos(math.radians(a1)), 1)
    y1 = round(cy + r * math.sin(math.radians(a1)), 1)
    large = 1 if (a1 - a0) > 180 else 0
    return '<path d="M%s %s A%s %s 0 %s 1 %s %s" fill="none" stroke="%s" stroke-width="1.5"/>' % (x0, y0, r, r, large, x1, y1, A)

def lattice(did, x, y, w, h):
    # diagonal cross-hatch clipped to a rect; clip id unique per design
    lines = []
    step = 9
    for k in range(-h, w + h, step):
        lines.append('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (x + k, y, x + k + h, y + h))
        lines.append('<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (x + k + h, y, x + k, y + h))
    return ('<clipPath id="clip-%s"><rect x="%s" y="%s" width="%s" height="%s" rx="6"/></clipPath>'
            '<g clip-path="url(#clip-%s)" stroke="%s" stroke-width="1" opacity="0.85">%s</g>'
            '<rect x="%s" y="%s" width="%s" height="%s" rx="6" fill="none" stroke="%s" stroke-width="1.6"/>'
            % (did, x, y, w, h, did, A, "".join(lines), x, y, w, h, H))

def hand(motifs):
    # stylised palm: 4 fingers, thumb, palm
    fingers = ""
    for (x, y, hgt, w) in ((62, 22, 52, 16), (82, 8, 68, 16), (102, 14, 62, 16), (122, 28, 44, 15)):
        fingers += '<rect x="%s" y="%s" width="%s" height="%s" rx="7" fill="%s" stroke="%s" stroke-width="1.6"/>' % (x, y, w, hgt, SKIN, OUTLINE)
    thumb = '<rect x="140" y="122" width="15" height="56" rx="7" fill="%s" stroke="%s" stroke-width="1.6" transform="rotate(32 147 150)"/>' % (SKIN, OUTLINE)
    palm = '<rect x="58" y="70" width="84" height="168" rx="28" fill="%s" stroke="%s" stroke-width="1.6"/>' % (SKIN, OUTLINE)
    return ('<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mehndi design">'
            '%s%s%s<g stroke-linecap="round">%s</g></svg>') % (fingers, thumb, palm, motifs)

def foot(motifs):
    toes = ""
    for (cx, r) in ((70, 10), (88, 11), (106, 11), (124, 10), (141, 8)):
        toes += '<circle cx="%s" cy="30" r="%s" fill="%s" stroke="%s" stroke-width="1.6"/>' % (cx, r, SKIN, OUTLINE)
    sole = '<rect x="62" y="38" width="76" height="198" rx="32" fill="%s" stroke="%s" stroke-width="1.6"/>' % (SKIN, OUTLINE)
    return ('<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mehndi design">'
            '%s%s<g stroke-linecap="round">%s</g></svg>') % (toes, sole, motifs)

# ---------- Designs ----------
def S(en, bn):
    return {"en": en, "bn": bn}

DESIGNS = [
    {
        "id": "bridal-mandala", "cat": "bridal", "diff": "hard", "minutes": 90,
        "name": S("Rajkumari Mandala", "রাজকুমারী মণ্ডল"),
        "blurb": S("A full-palm bridal mandala with a wrist medallion — the classic wedding centrepiece.",
                   "বিয়ের ক্লাসিক নকশা — পুরো তালু জুড়ে মণ্ডল আর কবজিতে মেডেলিয়ন।"),
        "bestFor": S("Weddings & engagement", "বিয়ে ও বাগদান"),
        "steps": [
            S("Draw the centre dot, then the inner and outer circles of the mandala.",
              "মাঝখানে বিন্দু দিয়ে ভেতরের ও বাইরের বৃত্ত আঁকুন।"),
            S("Add eight petals around the centre, then the ring of dots.",
              "মাঝখানে আটটি পাপড়ি আঁকুন, তারপর চারপাশে বিন্দুর বৃত্ত।"),
            S("Fill the wrist medallion and link it to the palm with a short vine.",
              "কবজির মেডেলিয়ন ভরাট করুন, ছোট লতা দিয়ে তালুর সঙ্গে জুড়ুন।"),
            S("Add a small flower on the middle fingertip and tidy the edges.",
              "মাঝের আঙুলের ডগায় ছোট ফুল আঁকুন, কিনারাগুলো পরিষ্কার করুন।"),
        ],
        "svg": hand(mandala(100, 152, 40) + mandala(100, 216, 16) + flower(90, 26, 9) + vine(100, 196, 100, 176, False) + paisley(72, 120, 12, -25) + paisley(128, 120, 12, 25) + dots_row(70, 130, 96, 5, 1.8)),
    },
    {
        "id": "bridal-paisley", "cat": "bridal", "diff": "hard", "minutes": 75,
        "name": S("Dulhan Paisley Trail", "দুলহান পেইজলি"),
        "blurb": S("A large paisley centrepiece with trailing mini-paisleys up the fingers.",
                   "বড় পেইজলি মাঝখানে, আঙুলের দিকে ছোট ছোট পেইজলির সারি।"),
        "bestFor": S("Weddings & mehndi night", "বিয়ে ও মেহেদি সন্ধ্যা"),
        "steps": [
            S("Draw the big paisley in the middle of the palm first.",
              "প্রথমে তালুর মাঝখানে বড় পেইজলিটি আঁকুন।"),
            S("Add the inner curl and the dot inside the paisley.",
              "পেইজলির ভেতরে কার্ল আর বিন্দু যোগ করুন।"),
            S("Place two small tilted paisleys above it, towards the fingers.",
              "তার উপরে আঙুলের দিকে দুটি ছোট হেলানো পেইজলি বসান।"),
            S("Finish with a vine up the middle finger and dots around the edges.",
              "মাঝের আঙুলে লতা আর কিনারায় বিন্দু দিয়ে শেষ করুন।"),
        ],
        "svg": hand(paisley(100, 152, 34, 0) + paisley(76, 118, 13, -30) + paisley(124, 118, 13, 30) + vine(100, 118, 90, 30) + flower(100, 205, 12) + dots_row(68, 132, 96, 5, 1.8) + arc(100, 152, 46, 200, 340)),
    },
    {
        "id": "bridal-lattice", "cat": "bridal", "diff": "medium", "minutes": 60,
        "name": S("Shahi Jaali", "শাহী জালি"),
        "blurb": S("A fine jaali (lattice) panel across the palm, framed by a flower and a wrist band.",
                   "তালু জুড়ে সূক্ষ্ম জালি, ফুল আর কবজির ব্যান্ড দিয়ে সাজানো।"),
        "bestFor": S("Weddings & Eid", "বিয়ে ও ঈদ"),
        "steps": [
            S("Outline the lattice panel on the palm and draw the diagonal lines.",
              "তালুতে জালির ঘর আঁকুন, তারপর কর্ণ রেখাগুলো টানুন।"),
            S("Draw the cross diagonals to finish the jaali squares.",
              "উল্টো কর্ণ টেনে জালির ঘরগুলো পূর্ণ করুন।"),
            S("Place a flower in the middle of the panel.",
              "ঘরের মাঝখানে একটি ফুল বসান।"),
            S("Add the wrist band with triangles and dots on the fingertips.",
              "কবজির ব্যান্ডে ত্রিভুজ আর আঙুলের ডগায় বিন্দু যোগ করুন।"),
        ],
        "svg": hand(lattice("bridal-lattice", 70, 112, 60, 76) + flower(100, 150, 14) + band(208) + dot(70, 30, 2.4) + dot(90, 20, 2.4) + dot(110, 24, 2.4) + dot(129, 36, 2.4) + arc(100, 150, 52, 150, 390)),
    },
    {
        "id": "arabic-vine", "cat": "arabic", "diff": "medium", "minutes": 45,
        "name": S("Arabic Vine Trail", "আরবি লতা"),
        "blurb": S("One flowing vine from wrist to fingertip with leaves and small blooms — light and airy.",
                   "কবজি থেকে আঙুলের ডগা পর্যন্ত একটি লতা, পাতা আর ছোট ফুল — হালকা আরবি স্টাইল।"),
        "bestFor": S("Eid & parties", "ঈদ ও অনুষ্ঠান"),
        "steps": [
            S("Start the vine at the wrist and sweep it diagonally to the index finger.",
              "কবজি থেকে লতা শুরু করে তির্যকভাবে তর্জনী পর্যন্ত টানুন।"),
            S("Add leaves along the vine, alternating sides.",
              "লতার দুই পাশে একটার পর একটা পাতা যোগ করুন।"),
            S("Place a small flower at each bend of the vine.",
              "লতার প্রতিটি বাঁকে একটি ছোট ফুল বসান।"),
            S("Scatter dots beside the vine to fill the empty palm.",
              "লতার পাশে বিন্দু ছড়িয়ে খালি জায়গা ভরাট করুন।"),
        ],
        "svg": hand(vine(72, 224, 86, 30) + flower(84, 170, 11) + flower(96, 110, 10) + flower(88, 60, 9) + paisley(122, 160, 14, 20) + dots_row(104, 132, 190, 4, 1.8) + dots_row(104, 128, 210, 3, 1.8)),
    },
    {
        "id": "arabic-floral", "cat": "arabic", "diff": "medium", "minutes": 40,
        "name": S("Gulf Bloom", "গাল্ফ ফুল"),
        "blurb": S("Three bold blooms marching diagonally across the palm with leafy stems.",
                   "তালুর উপর দিয়ে তির্যকভাবে তিনটি বড় ফুল, পাতাসহ ডাল।"),
        "bestFor": S("Eid & family events", "ঈদ ও পারিবারিক অনুষ্ঠান"),
        "steps": [
            S("Draw three flower centres on a diagonal line across the palm.",
              "তালুর উপর তির্যক রেখায় তিনটি ফুলের কেন্দ্র আঁকুন।"),
            S("Add six petals to each flower, keeping them the same size.",
              "প্রতিটি ফুলে ছয়টি পাপড়ি যোগ করুন, আকার সমান রাখুন।"),
            S("Join the flowers with a thin curved stem and small leaves.",
              "পাতলা বাঁকা ডাল আর ছোট পাতা দিয়ে ফুলগুলো জুড়ুন।"),
            S("Add dot clusters in the gaps and a tiny flower on the ring finger.",
              "ফাঁকে বিন্দুর গুচ্ছ আর অনামিকায় ছোট ফুল যোগ করুন।"),
        ],
        "svg": hand(flower(76, 190, 15) + flower(100, 150, 15) + flower(124, 110, 15) + vine(76, 190, 124, 110, True) + flower(110, 36, 8) + dots_row(70, 130, 96, 5, 1.8) + dots_row(84, 116, 222, 3, 1.8)),
    },
    {
        "id": "arabic-cuff", "cat": "arabic", "diff": "easy", "minutes": 25,
        "name": S("Wrist Cuff Bloom", "কবজি ফুল"),
        "blurb": S("A pretty cuff band at the wrist with one small mandala on the palm — quick and neat.",
                   "কবজিতে সুন্দর ব্যান্ড আর তালুতে ছোট মণ্ডল — দ্রুত, পরিপাটি নকশা।"),
        "bestFor": S("Everyday & office", "প্রতিদিন ও অফিস"),
        "steps": [
            S("Draw two lines across the wrist for the cuff band.",
              "কবজি জুড়ে ব্যান্ডের জন্য দুটি রেখা টানুন।"),
            S("Fill the band with a flower in the middle and dots on both sides.",
              "ব্যান্ডের মাঝে ফুল আর দুই পাশে বিন্দু ভরুন।"),
            S("Draw a small mandala in the centre of the palm.",
              "তালুর মাঝখানে ছোট একটি মণ্ডল আঁকুন।"),
            S("Add one dot on each fingertip to finish.",
              "প্রতিটি আঙুলের ডগায় একটি করে বিন্দু দিয়ে শেষ করুন।"),
        ],
        "svg": hand(band(200) + band(216) + flower(100, 208, 10) + mandala(100, 150, 24) + dot(70, 30, 2.4) + dot(90, 20, 2.4) + dot(110, 24, 2.4) + dot(129, 36, 2.4)),
    },
    {
        "id": "simple-mandala", "cat": "simple", "diff": "easy", "minutes": 15,
        "name": S("Chhoto Mandala", "ছোট মণ্ডল"),
        "blurb": S("One neat mandala on the palm and a tiny flower on the ring finger — the 15-minute classic.",
                   "তালুতে একটি পরিপাটি মণ্ডল আর অনামিকায় ছোট ফুল — ১৫ মিনিটের ক্লাসিক।"),
        "bestFor": S("Beginners & school events", "নতুনরা ও স্কুলের অনুষ্ঠান"),
        "steps": [
            S("Draw the centre dot and two circles around it.",
              "মাঝে বিন্দু দিয়ে তার চারপাশে দুটি বৃত্ত আঁকুন।"),
            S("Add eight petals between the circles.",
              "বৃত্ত দুটির মাঝে আটটি পাপড়ি যোগ করুন।"),
            S("Place a ring of dots outside the mandala.",
              "মণ্ডলের বাইরে বিন্দুর বৃত্ত বসান।"),
            S("Finish with a tiny flower on the ring finger.",
              "অনামিকায় ছোট ফুল দিয়ে শেষ করুন।"),
        ],
        "svg": hand(mandala(100, 152, 26) + flower(110, 40, 8) + dots_row(76, 124, 200, 3, 1.8)),
    },
    {
        "id": "simple-dots", "cat": "simple", "diff": "easy", "minutes": 10,
        "name": S("Bindu Chain", "বিন্দু চেইন"),
        "blurb": S("Dots, arcs and one small flower — the easiest design here, perfect for a first try.",
                   "বিন্দু, বাঁক আর একটি ছোট ফুল — এখানকার সবচেয়ে সহজ নকশা, প্রথম চেষ্টার জন্য।"),
        "bestFor": S("First try & kids", "প্রথম চেষ্টা ও শিশুরা"),
        "steps": [
            S("Draw a small flower in the middle of the palm.",
              "তালুর মাঝখানে ছোট একটি ফুল আঁকুন।"),
            S("Draw an arc above the flower and dot along it.",
              "ফুলের উপরে একটি বাঁক টেনে তার উপর বিন্দু বসান।"),
            S("Add rows of dots from the flower towards the wrist.",
              "ফুল থেকে কবজির দিকে বিন্দুর সারি যোগ করুন।"),
            S("Put one dot on each fingertip.",
              "প্রতিটি আঙুলের ডগায় একটি করে বিন্দু দিন।"),
        ],
        "svg": hand(flower(100, 150, 13) + arc(100, 150, 30, 200, 340) + dots_row(70, 130, 120, 5, 2) + dots_row(76, 124, 190, 4, 2) + dots_row(84, 116, 212, 3, 2) + dot(70, 30, 2.4) + dot(90, 20, 2.4) + dot(110, 24, 2.4) + dot(129, 36, 2.4)),
    },
    {
        "id": "simple-flower", "cat": "simple", "diff": "easy", "minutes": 20,
        "name": S("Phool Pata", "ফুল পাতা"),
        "blurb": S("One big bloom in the centre with small flowers at the palm corners and a leafy wrist vine.",
                   "মাঝে বড় ফুল, তালুর কোণায় ছোট ফুল আর কবজিতে পাতার লতা।"),
        "bestFor": S("Eid morning & picnics", "ঈদের সকাল ও পিকনিক"),
        "steps": [
            S("Draw the big flower in the centre of the palm.",
              "তালুর মাঝখানে বড় ফুলটি আঁকুন।"),
            S("Add a small flower near each corner of the palm.",
              "তালুর প্রতিটি কোণার কাছে একটি করে ছোট ফুল যোগ করুন।"),
            S("Draw a short leafy vine across the wrist.",
              "কবজি জুড়ে পাতাসহ ছোট একটি লতা আঁকুন।"),
            S("Fill the gaps with dot clusters.",
              "ফাঁকা জায়গায় বিন্দুর গুচ্ছ দিয়ে ভরাট করুন।"),
        ],
        "svg": hand(flower(100, 150, 20) + flower(72, 116, 9) + flower(128, 116, 9) + flower(72, 186, 9) + flower(128, 186, 9) + vine(66, 216, 134, 216) + dots_row(84, 116, 96, 3, 1.8)),
    },
    {
        "id": "feet-mandala", "cat": "feet", "diff": "medium", "minutes": 50,
        "name": S("Paye Mandala", "পায়ে মণ্ডল"),
        "blurb": S("A mandala on the sole with dotted toes and an ankle band — the classic foot design.",
                   "পায়ের তলায় মণ্ডল, আঙুলে বিন্দু আর গোড়ালিতে ব্যান্ড — ক্লাসিক পায়ের নকশা।"),
        "bestFor": S("Weddings & Eid", "বিয়ে ও ঈদ"),
        "steps": [
            S("Draw the mandala in the middle of the sole.",
              "পায়ের তলার মাঝখানে মণ্ডলটি আঁকুন।"),
            S("Add a dot on the tip of each toe.",
              "প্রতিটি আঙুলের ডগায় একটি করে বিন্দু দিন।"),
            S("Draw the ankle band with small triangles.",
              "গোড়ালিতে ছোট ত্রিভুজসহ ব্যান্ড আঁকুন।"),
            S("Add a small flower above the mandala, towards the toes.",
              "মণ্ডলের উপরে আঙুলের দিকে ছোট একটি ফুল যোগ করুন।"),
        ],
        "svg": foot(mandala(100, 140, 36) + band(58, 66, 134) + flower(100, 96, 10) + dot(70, 26, 2.4) + dot(88, 24, 2.4) + dot(106, 24, 2.4) + dot(124, 26, 2.4) + dot(141, 28, 2.2) + dots_row(76, 124, 190, 4, 1.8)),
    },
    {
        "id": "feet-anklet", "cat": "feet", "diff": "medium", "minutes": 35,
        "name": S("Payel Anklet", "পায়েল"),
        "blurb": S("A payel-style anklet band with hanging drops, a sole flower and dotted toes.",
                   "পায়েলের মতো গোড়ালির ব্যান্ড, ঝুলন্ত ফোঁটা, তলায় ফুল আর আঙুলে বিন্দু।"),
        "bestFor": S("Weddings & festivals", "বিয়ে ও উৎসব"),
        "steps": [
            S("Draw two lines across the ankle for the anklet band.",
              "গোড়ালি জুড়ে পায়েলের জন্য দুটি রেখা টানুন।"),
            S("Hang small drops and dots below the band.",
              "ব্যান্ডের নিচে ছোট ফোঁটা আর বিন্দু ঝুলিয়ে দিন।"),
            S("Place a flower in the centre of the sole.",
              "পায়ের তলার মাঝখানে একটি ফুল বসান।"),
            S("Add a dot on each toe and a vine down the middle.",
              "প্রতিটি আঙুলে বিন্দু আর মাঝখানে লতা টেনে শেষ করুন।"),
        ],
        "svg": foot(band(56, 66, 134) + band(70, 66, 134) + flower(100, 150, 14) + vine(100, 168, 100, 216, False) + dot(70, 26, 2.4) + dot(88, 24, 2.4) + dot(106, 24, 2.4) + dot(124, 26, 2.4) + dot(141, 28, 2.2)),
    },
    {
        "id": "feet-toe", "cat": "feet", "diff": "easy", "minutes": 20,
        "name": S("Angul Phool", "আঙুল ফুল"),
        "blurb": S("A tiny flower on every toe with a slim vine down the sole — light, quick and pretty.",
                   "প্রতিটি আঙুলে ছোট ফুল, তলায় সরু লতা — হালকা, দ্রুত, সুন্দর।"),
        "bestFor": S("Beginners & Eid", "নতুনরা ও ঈদ"),
        "steps": [
            S("Draw a tiny flower on the big toe first.",
              "প্রথমে বড় আঙুলে ছোট ফুল আঁকুন।"),
            S("Repeat the flower on the other four toes, getting smaller.",
              "বাকি চার আঙুলে ক্রমে ছোট করে একই ফুল আঁকুন।"),
            S("Draw a slim vine from the toes down the middle of the sole.",
              "আঙুল থেকে তলার মাঝখান দিয়ে সরু লতা টানুন।"),
            S("Add dots on both sides of the vine.",
              "লতার দুই পাশে বিন্দু যোগ করুন।"),
        ],
        "svg": foot(flower(70, 30, 7) + flower(88, 28, 7) + flower(106, 28, 7) + flower(124, 30, 6) + flower(141, 30, 5) + vine(100, 60, 100, 210, True) + dots_row(76, 124, 100, 4, 1.8) + dots_row(84, 116, 220, 3, 1.8)),
    },
]

# ---------- Guide content ----------
GUIDE = {
    "ingredients": [
        S("Henna powder — 100 g (body-art quality, finely sifted)", "মেহেদি গুঁড়া — ১০০ গ্রাম (সূক্ষ্মভাবে চালা, ভালো মানের)"),
        S("Lemon juice — 2 tablespoons", "লেবুর রস — ২ টেবিল চামচ"),
        S("Sugar — 1 tablespoon (helps the paste stick)", "চিনি — ১ টেবিল চামচ (পেস্ট লেগে থাকতে সাহায্য করে)"),
        S("Strong tea or coffee water — about half a cup, cooled", "কড়া চা বা কফির পানি — প্রায় আধা কাপ, ঠান্ডা করা"),
        S("Eucalyptus or tea-tree oil — 1 teaspoon (optional, deepens colour)", "ইউক্যালিপটাস বা টি-ট্রি তেল — ১ চা চামচ (ঐচ্ছিক, রং গাঢ় করে)"),
        S("A cone or applicator bottle, and cling film", "একটি কোন বা অ্যাপ্লিকেটর বোতল, আর ক্লিং ফিল্ম"),
    ],
    "mixing": [
        S("Sift the henna powder into a bowl so no lumps remain.", "মেহেদি গুঁড়া চেলে নিন, যাতে কোনো গোটা না থাকে।"),
        S("Add lemon juice and the cooled tea a little at a time, stirring to a thick yoghurt texture.", "অল্প অল্প করে লেবুর রস ও ঠান্ডা চা মিশিয়ে ঘন দইয়ের মতো পেস্ট বানান।"),
        S("Stir in the sugar and the oil until smooth.", "চিনি ও তেল মিশিয়ে মসৃণ করে নিন।"),
        S("Cover with cling film and rest 6–8 hours (overnight is best) so the dye releases.", "ক্লিং ফিল্ম দিয়ে ঢেকে ৬–৮ ঘণ্টা (সারা রাত ভালো) রেখে দিন, যাতে রং বের হয়।"),
        S("Spoon the paste into a cone, twist the top shut, and snip a tiny tip.", "পেস্ট কোনে ভরে উপরের দিক মুড়ে নিন, ডগা সামান্য কাটুন।"),
    ],
    "application": [
        S("Wash and dry the skin — no lotion or oil on it.", "ত্বক ধুয়ে শুকিয়ে নিন — লোশন বা তেল লাগাবেন না।"),
        S("Rest your hand on a flat surface and keep it still.", "হাত সমতল জায়গায় রেখে স্থির রাখুন।"),
        S("Draw outlines first, then fill the shapes — slow, steady lines.", "আগে আউটলাইন আঁকুন, তারপর ভেতর ভরাট করুন — ধীরে, স্থির হাতে।"),
        S("If a line goes wrong, wipe it at once with a damp cotton bud.", "কোনো লাইন ভুল হলে সঙ্গে সঙ্গে ভেজা কটন বাড দিয়ে মুছে নিন।"),
        S("Let the paste dry fully (about 30 minutes) before moving the hand.", "পেস্ট পুরো শুকাতে দিন (প্রায় ৩০ মিনিট), তারপর হাত নাড়ান।"),
    ],
    "aftercare": [
        S("Keep the paste on for 6–8 hours — longer gives a darker stain.", "পেস্ট ৬–৮ ঘণ্টা রেখে দিন — বেশি রাখলে রং গাঢ় হয়।"),
        S("Seal with lemon-sugar water dabbed on gently while it dries.", "শুকানোর সময় লেবু-চিনির পানি হালকা করে লাগান।"),
        S("Scrape the dried paste off — do not wash with water.", "শুকনো পেস্ট ঘষে তুলুন — পানি দিয়ে ধোবেন না।"),
        S("Avoid water on the stain for the first 24 hours if you can.", "প্রথম ২৪ ঘণ্টা রংয়ে পানি না লাগানোই ভালো।"),
        S("Rub a little coconut or mustard oil on the stain to protect it.", "রংয়ের উপর সামান্য নারকেল বা সরিষার তেল লাগিয়ে রাখুন।"),
    ],
    "stainStages": [
        {"hours": 0, "label": S("Fresh paste — orange", "সদ্য পেস্ট — কমলা")},
        {"hours": 6, "label": S("Paste off — light orange", "পেস্ট তোলা — হালকা কমলা")},
        {"hours": 24, "label": S("Developing — reddish brown", "রং ধরছে — লালচে বাদামি")},
        {"hours": 48, "label": S("Peak — deep brown", "সবচেয়ে গাঢ় — গভীর বাদামি")},
        {"hours": 168, "label": S("Fading — lightens over 1–2 weeks", "হালকা হচ্ছে — ১–২ সপ্তাহে মিলিয়ে যায়")},
    ],
}

I18N = {
    "en": {
        "title": "Mehndi Design BD",
        "subtitle": "Henna designs, paste guide & practice tracker — offline, in Bangla & English.",
        "tab_gallery": "Gallery", "tab_guide": "Paste Guide", "tab_progress": "My Progress",
        "search_ph": "Search designs…", "filter_cat": "Category", "filter_diff": "Difficulty",
        "all": "All", "bridal": "Bridal", "arabic": "Arabic", "simple": "Simple", "feet": "Feet",
        "easy": "Easy", "medium": "Medium", "hard": "Hard",
        "fav_only": "Favourites only", "favourite": "Favourite",
        "no_results": "No designs match your filters.",
        "minutes": "{n} min", "best_for": "Best for", "how_to": "How to draw it",
        "mark_tried": "Mark as tried", "tried": "Tried ✓", "unmark_tried": "Remove tried mark",
        "note_ph": "Your note — what worked, what to fix…",
        "save_note": "Save note", "note_saved": "Note saved.",
        "back": "← Back to gallery",
        "guide_paste": "Henna paste — mix it yourself",
        "guide_ingredients": "What you need", "guide_mixing": "Mixing steps",
        "guide_apply": "Applying the design", "guide_care": "Aftercare — keep the colour dark",
        "guide_stain": "Stain timeline (typical)",
        "guide_note": "Traditional guidance, not medical advice. Patch-test on a small spot first if your skin is sensitive — stop if it itches or burns.",
        "stat_tried": "Designs tried", "stat_favs": "Favourites", "stat_notes": "Notes",
        "stat_by_cat": "Tried by category",
        "my_notes": "My notes", "no_notes": "No notes yet — open a design and write one.",
        "tried_list": "Designs I have tried", "none_tried": "Nothing tried yet — pick a design from the Gallery and tap “Mark as tried”.",
        "export": "Export my data", "import": "Import data", "erase": "Erase everything",
        "erase_confirm": "Type DELETE to erase all favourites, tried marks and notes.",
        "erase_done": "All data erased.",
        "import_ok": "Data imported.", "import_bad": "That file is not a Mehndi Design BD export.",
        "footer": "Original artwork drawn in code — no photos copied. Personal practice tool, not a professional henna service. All data stays on your device.",
        "step": "Step {n}",
        "of_total": "{a} / {b} designs",
        "stain_now": "Stain checker",
        "stain_hint": "Hours since you scraped the paste off:",
        "stain_result": "Expected stain now:",
    },
    "bn": {
        "title": "মেহেদি ডিজাইন বিডি",
        "subtitle": "মেহেদির নকশা, পেস্টের গাইড ও অনুশীলনের হিসাব — অফলাইনে, বাংলা ও ইংরেজিতে।",
        "tab_gallery": "গ্যালারি", "tab_guide": "পেস্ট গাইড", "tab_progress": "আমার অগ্রগতি",
        "search_ph": "নকশা খুঁজুন…", "filter_cat": "ধরন", "filter_diff": "কঠিনতা",
        "all": "সব", "bridal": "বিয়ের", "arabic": "আরবি", "simple": "সহজ", "feet": "পায়ের",
        "easy": "সহজ", "medium": "মাঝারি", "hard": "কঠিন",
        "fav_only": "শুধু প্রিয়গুলো", "favourite": "প্রিয়",
        "no_results": "এই ফিল্টারে কোনো নকশা মেলেনি।",
        "minutes": "{n} মিনিট", "best_for": "কিসের জন্য ভালো", "how_to": "কীভাবে আঁকবেন",
        "mark_tried": "চেষ্টা করেছি বলে চিহ্ন দিন", "tried": "চেষ্টা করা হয়েছে ✓", "unmark_tried": "চেষ্টার চিহ্ন তুলুন",
        "note_ph": "আপনার নোট — কী ভালো হলো, কী ঠিক করতে হবে…",
        "save_note": "নোট সংরক্ষণ করুন", "note_saved": "নোট সংরক্ষিত হয়েছে।",
        "back": "← গ্যালারিতে ফিরুন",
        "guide_paste": "মেহেদির পেস্ট — নিজে বানান",
        "guide_ingredients": "যা যা লাগবে", "guide_mixing": "মেশানোর ধাপ",
        "guide_apply": "নকশা লাগানো", "guide_care": "যত্ন — রং গাঢ় রাখুন",
        "guide_stain": "রংয়ের সময়রেখা (সাধারণত)",
        "guide_note": "ঐতিহ্যবাহী নির্দেশনা, চিকিৎসা পরামর্শ নয়। ত্বক সংবেদনশীল হলে আগে ছোট জায়গায় পরীক্ষা করুন — চুলকালে বা জ্বালা করলে থামুন।",
        "stat_tried": "চেষ্টা করা নকশা", "stat_favs": "প্রিয়", "stat_notes": "নোট",
        "stat_by_cat": "ধরন অনুযায়ী চেষ্টা",
        "my_notes": "আমার নোট", "no_notes": "এখনো নোট নেই — একটি নকশা খুলে লিখুন।",
        "tried_list": "আমি যেসব নকশা চেষ্টা করেছি", "none_tried": "এখনো কিছু চেষ্টা করা হয়নি — গ্যালারি থেকে একটি নকশা বেছে “চেষ্টা করেছি” চাপুন।",
        "export": "আমার তথ্য রপ্তানি করুন", "import": "তথ্য আমদানি করুন", "erase": "সব মুছে ফেলুন",
        "erase_confirm": "সব প্রিয়, চেষ্টার চিহ্ন ও নোট মুছতে DELETE লিখুন।",
        "erase_done": "সব তথ্য মোছা হয়েছে।",
        "import_ok": "তথ্য আমদানি হয়েছে।", "import_bad": "এটি মেহেদি ডিজাইন বিডির রপ্তানি ফাইল নয়।",
        "footer": "কোডে আঁকা মৌলিক শিল্পকর্ম — কোনো ছবি কপি করা হয়নি। ব্যক্তিগত অনুশীলনের টুল, পেশাদার মেহেদি সেবা নয়। সব তথ্য আপনার ডিভাইসেই থাকে।",
        "step": "ধাপ {n}",
        "of_total": "{a} / {b}টি নকশা",
        "stain_now": "রং পরীক্ষক",
        "stain_hint": "পেস্ট তোলার পর কত ঘণ্টা হয়েছে:",
        "stain_result": "এখনকার প্রত্যাশিত রং:",
    },
}

def emit():
    os.makedirs(OUT, exist_ok=True)
    designs_js = "var DESIGNS = " + json.dumps(DESIGNS, ensure_ascii=True, indent=1) + ";\n"
    guide_js = "var GUIDE = " + json.dumps(GUIDE, ensure_ascii=True, indent=1) + ";\n"
    data_js = ("// mehndi-design-bd -- design bank + paste guide (generated by tools/gen.py).\n"
               "// All 12 SVG designs are original artwork drawn in code. Pure ASCII file:\n"
               "// Bengali text is \\uXXXX-escaped. Do not hand-edit; re-run tools/gen.py.\n"
               "(function (root) {\n  'use strict';\n"
               "  " + designs_js.replace("\n", "\n  ") +
               "  " + guide_js.replace("\n", "\n  ") +
               "  if (typeof module !== 'undefined' && module.exports) { module.exports = { DESIGNS: DESIGNS, GUIDE: GUIDE }; }\n"
               "  else { root.MEHNDI_DATA = { DESIGNS: DESIGNS, GUIDE: GUIDE }; }\n"
               "})(typeof window !== 'undefined' ? window : globalThis);\n")
    with open(os.path.join(OUT, "data.js"), "w", encoding="ascii") as f:
        f.write(data_js)

    i18n_js = ("// mehndi-design-bd -- UI strings (generated by tools/gen.py).\n"
               "(function (root) {\n  'use strict';\n"
               "  var I18N = " + json.dumps(I18N, ensure_ascii=True, indent=1).replace("\n", "\n  ") + ";\n"
               "  if (typeof module !== 'undefined' && module.exports) { module.exports = I18N; }\n"
               "  else { root.MEHNDI_I18N = I18N; }\n"
               "})(typeof window !== 'undefined' ? window : globalThis);\n")
    with open(os.path.join(OUT, "i18n.js"), "w", encoding="ascii") as f:
        f.write(i18n_js)
    print("wrote data.js + i18n.js")

if __name__ == "__main__":
    emit()
