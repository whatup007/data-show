# AURA 鈥?鏅鸿兘鑳借€楃洃娴嬪钩鍙?
鍩轰簬 Flask + Three.js 鐨勮兘鑰楁暟鎹彲瑙嗗寲骞冲彴锛屾敮鎸?*3D 鎴垮眿妯″瀷浜や簰**銆?*鎴峰瀷鑷畾涔夌紪杈?*銆佸缁村害鍥捐〃鍒嗘瀽銆?
---

## 鍔熻兘鐗规€?
### 馃彔 3D 鎴峰瀷鍙鍖?- Three.js 瀹炴椂娓叉煋鎴垮眿 3D 妯″瀷锛屾敮鎸佹棆杞€佺缉鏀?- 8 绉嶆埧闂寸被鍨嬶紙瀹㈠巺/鍘ㄦ埧/鍗у/娴村/涔︽埧/闂ㄥ巺/椁愬巺/杞﹀簱锛?- 鎴块棿鎮仠楂樹寒锛岀偣鍑绘煡鐪嬭鎴块棿鐢靛櫒鑳借€楁暟鎹?- 鍔ㄦ€佽兘閲忕矑瀛愬姩鐢讳笌娉㈢汗鐗规晥

### 鉁忥笍 鎴峰瀷缂栬緫鍣?- 2D Canvas 甯冨眬缂栬緫鍣紝鎷栨嫿/缂╂斁/娣诲姞/鍒犻櫎鎴块棿
- 5 濂楅璁炬埛鍨嬶細灏忔埛鍨嬪叕瀵撱€佹爣鍑嗕笁灞呭銆佸ぇ骞冲眰銆佽仈鎺掑埆澧呫€佸紑鏀惧紡宸ヤ綔瀹?- 缂栬緫鍚?3D 妯″瀷瀹炴椂鍚屾鏇存柊
- 甯冨眬鏁版嵁閫氳繃 localStorage 鑷姩淇濆瓨

### 馃搳 鏁版嵁浠〃鐩?- **鍔熺巼瓒嬪娍鍥?* 鈥?鎶樼嚎鍥惧睍绀哄钩鍧?鏈€澶?鏈€灏忓姛鐜囧彉鍖?- **鐢靛櫒鑳借€楀垎甯?* 鈥?妯悜鏉″舰鍥?Top8 鐢靛櫒鎺掑悕
- **绫诲瀷鍗犳瘮** 鈥?鐜舰楗煎浘鎸夌數鍣ㄧ被鍨嬪垎绫?- **鐢靛櫒杩愯鐘跺喌** 鈥?鍒嗚〃婵€娲绘鏁版帓琛?- **缁熻姒傝** 鈥?鎬昏褰?骞冲潎鍔熺巼/鏈€澶?鏈€灏?鎬昏兘鑰?璁惧鏁?- 鏀寔寤虹瓚/鐢靛櫒绛涢€?+ 鏃堕棿鑼冨洿鍒囨崲锛?4h / 7d / 30d / 1y锛?
### 馃寪 鍥介檯鍖?- 涓?鑻辨枃鍙岃鐣岄潰锛岃嚜鍔ㄦ娴嬫祻瑙堝櫒璇█

---

## 鎶€鏈爤

| 灞傜骇 | 鎶€鏈?|
|------|------|
| 鍚庣 | Python 3 + Flask 3.0 |
| 鏁版嵁搴?| MySQL / SQLite锛堝紑鍙戯級锛孲QLAlchemy ORM |
| 鍓嶇 | Vanilla JS锛堟棤妗嗘灦锛夛紝ECharts 5.5锛孴hree.js |
| 鏁版嵁婧?| HDF5 鏍煎紡鑳借€楁暟鎹紙h5py 瑙ｆ瀽锛?|
| 閮ㄧ讲 | Gunicorn / uWSGI |

---

## 蹇€熷紑濮?
### 鐜瑕佹眰

- Python 3.10+
- MySQL 5.7+锛堢敓浜э級鎴?SQLite锛堝紑鍙戯級

### 瀹夎

```bash
# 鍏嬮殕椤圭洰
git clone https://github.com/whatup007/data-show.git
cd data-show

# 鍒涘缓铏氭嫙鐜
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux / macOS

# 瀹夎渚濊禆
pip install -r requirements.txt
```

### 閰嶇疆

鍒涘缓 `.env` 鏂囦欢锛?
```env
SECRET_KEY=your-secret-key
DEBUG=true
HOST=0.0.0.0
PORT=5000
DATABASE_URL=sqlite:///dev.db
```

### 瀵煎叆鏁版嵁

```bash
python -m scripts.import_h5
```

### 杩愯

```bash
python main.py
```

璁块棶 `http://localhost:5000` 鏌ョ湅棣栭〉锛宍/dashboard` 杩涘叆鏁版嵁鐪嬫澘銆?
---

## 椤圭洰缁撴瀯

```
data-show/
鈹溾攢鈹€ app/
鈹?  鈹溾攢鈹€ models/          # 鏁版嵁搴撴ā鍨?(Building, Appliance, LoadData)
鈹?  鈹溾攢鈹€ routes/          # Flask 璺敱 (main, api)
鈹?  鈹溾攢鈹€ services/        # 涓氬姟閫昏緫
鈹?  鈹溾攢鈹€ templates/       # Jinja2 妯℃澘
鈹?  鈹?  鈹溾攢鈹€ base.html        # 鍩虹甯冨眬
鈹?  鈹?  鈹溾攢鈹€ dashboard.html   # 鏁版嵁鐪嬫澘 + 鎴峰瀷缂栬緫鍣?鈹?  鈹?  鈹溾攢鈹€ index.html       # 棣栭〉
鈹?  鈹?  鈹斺攢鈹€ about.html       # 鍏充簬椤?鈹?  鈹溾攢鈹€ static/
鈹?  鈹?  鈹溾攢鈹€ js/
鈹?  鈹?  鈹?  鈹溾攢鈹€ floorplan_data.js     # 鍏变韩鏁版嵁妯″瀷锛堟埧闂?CRUD + 棰勮鎴峰瀷锛?鈹?  鈹?  鈹?  鈹溾攢鈹€ floorplan_storage.js  # localStorage 鎸佷箙鍖?鈹?  鈹?  鈹?  鈹溾攢鈹€ floorplan3d.js        # Three.js 3D 娓叉煋寮曟搸
鈹?  鈹?  鈹?  鈹溾攢鈹€ floorplan_editor.js   # 2D Canvas 鎴峰瀷缂栬緫鍣?鈹?  鈹?  鈹?  鈹溾攢鈹€ dashboard.js          # 鐪嬫澘涓氬姟閫昏緫 + i18n
鈹?  鈹?  鈹?  鈹斺攢鈹€ main.js               # 鍏ㄥ眬浜や簰锛堝鑸?绮掑瓙鑳屾櫙锛?鈹?  鈹?  鈹斺攢鈹€ css/
鈹?  鈹?      鈹溾攢鈹€ base.css              # 鍏ㄥ眬鏍峰紡
鈹?  鈹?      鈹溾攢鈹€ dashboard.css         # 鐪嬫澘鏍峰紡
鈹?  鈹?      鈹斺攢鈹€ floorplan_editor.css  # 缂栬緫鍣ㄦ牱寮?鈹?  鈹溾攢鈹€ utils/           # 宸ュ叿鍑芥暟
鈹?  鈹溾攢鈹€ extensions.py    # Flask 鎵╁睍鍒濆鍖?鈹?  鈹斺攢鈹€ cli.py           # 鍛戒护琛屽伐鍏?鈹溾攢鈹€ scripts/             # 鏁版嵁瀵煎叆鑴氭湰
鈹溾攢鈹€ config.py            # 閰嶇疆鏂囦欢
鈹溾攢鈹€ main.py              # 鍏ュ彛鏂囦欢
鈹斺攢鈹€ requirements.txt     # Python 渚濊禆
```

---

## 鍒嗘敮绛栫暐

```
main       鈫?鐢熶骇绋冲畾鐗堬紙鍙粠 develop merge锛?develop    鈫?鏃ュ父寮€鍙戜富绾?feature/*  鈫?鍗曞姛鑳藉紑鍙戝垎鏀?```

| 鍒嗘敮 | 璇存槑 |
|------|------|
| `main` | 绾夸笂杩愯鐨勭ǔ瀹氱増鏈紝姣忎釜鐗堟湰鎵?tag锛坴1.0, v2.0鈥︼級 |
| `develop` | 鎵€鏈夋柊鍔熻兘鍦ㄦ鍚堝叆娴嬭瘯锛岄€氳繃鍚?merge 鍒?main |
| `feature/*` | 鍗曚釜鍔熻兘鐙珛寮€鍙戯紝瀹屾垚鍚庡悎鍏?develop |

### 寮€鍙戞祦绋?
```bash
# 浠?develop 鍒涘缓鍔熻兘鍒嗘敮
git checkout develop
git checkout -b feature/鏂板姛鑳藉悕

# 寮€鍙戝畬鎴愬悗
git checkout develop
git merge feature/鏂板姛鑳藉悕
git push origin develop

# 鍙戝竷绋冲畾鐗?git checkout main
git merge develop
git tag v1.0
git push origin main --tags
```

---

## License

MIT
