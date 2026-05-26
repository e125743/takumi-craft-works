import getFirebaseIni from '../firebase';
import {ReplayOutlined, CameraAlt, ArrowBack, ArrowForward, Storage, SmartToy, LaptopMac, DownloadForOffline} from '@mui/icons-material';
import { Button, Box, Pagination, PaginationItem, Grid } from '@mui/material';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import Loading from '../components/Loading';
// import {Jimp} from 'jimp';
import UpIcon from '@mui/icons-material/FileUpload';
import { Buffer } from 'buffer';
import { httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";
// import MachieneImage from '../images/yolov8-test.jpg';
import { getDocs, orderBy, query, collection, limit, startAfter, endBefore, limitToLast } from 'firebase/firestore';
import { getDownloadURL, ref, getMetadata } from 'firebase/storage';
import { keyframes } from "@mui/system";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const columns = ['origine', 'detected', 'labels']
const fields = ['origineImageURL', 'detectedImageURL', 'labels']
const storages = {
	'origineImageURL': 'origineImages',
	'detectedImageURL': 'detectedImages'
}
const recordByPage = 3;
const upImageStatus = ['None', 'uploading', 'learning', 'complete']

const flag = typeof window !== 'undefined';
let function_instance = null
let function_ini = null;
let reader = null;
let documentInstance = null;
let db = null
let storage = null
if (flag) {
	function_instance = getFirebaseIni()
	// console.log('Appcheck')
	const appCheckInstance = initializeAppCheck(function_instance['firebase'], {
		// 取得した reCAPTCHA v3 のサイトキー（公開キー）
		provider: new ReCaptchaV3Provider("6Ldc4XgsAAAAAINpFRmQ-uQvCCPs6Xn888HT7qO4"),

		// 自動的に App Check トークンをリフレッシュさせる（推奨）
		isTokenAutoRefreshEnabled: true
	});

	// App Check トークンを取得して確認
	async function checkAppCheck() {
		try {
			const tokenResponse = await getToken(appCheckInstance, false);
			// console.log("App Check Token:", tokenResponse.token);
			// console.log("Expires at:", new Date(tokenResponse.expireTimeMillis));
		} catch (err) {
			console.error("App Check token error:", err);
		}
	}
	checkAppCheck();
	function_ini = function_instance['functions_ini']
	db = function_instance['database']
	storage = function_instance['storage']
	reader = new FileReader();
	window.Buffer = window.Buffer || Buffer;
	documentInstance = document
}

const ShowMaciene = () => {
	const [disabled, setDisabled] = useState(false);
	const [image, setImage] = useState('');
	const [align, setAlign] = useState(0);
	const [dic, setDic] = useState({});
	const [dicIds, setDicIds] = useState([]);
	const [firstSnap, setFirstSnap] = useState({});
	const [lastSnap, setLastSnap] = useState({});
	const [page, setPage] = useState(1);
	const [uploadedImage, setUploadedImage] = useState('');
	const uploadedImageRef = useRef(uploadedImage);
	const [upStatus, setUpStatus] = useState(upImageStatus[0]);

	const pica = require('pica')()

	const createRecordTable = (record, i_) => {
		let row_span = 3
		let label_num = 0
		if (record.labels !== undefined) {
			label_num = record.labels.length
			if (label_num > 3) {
				row_span = label_num
			}
		}
		return (
			<>
				<TableRow role="checkbox">
					{fields.map((field) => {
						// console.log(field.includes('Image'))
						// console.log(record[field])
						return field.includes('Image') ? (
								<TableCell key={`${field}-${i_}`} rowSpan={row_span}>
									{record[field] !== undefined &&
										<Box
											component="img"
											src={record[field]}
											alt="Logo"
											className='linkImage'
											sx={{
												width: '25vw',
												height: '25vw',
											}}
										/>
									}
								</TableCell>
							) :  field !== 'labels' && (
								<TableCell key={`${field}-${i_}`}  rowSpan={row_span}/>
						)
					})}
					{record['labels'] !== undefined ?
							<TableCell key={`'label1'-${i_}`} sx={{ verticalAlign: 'top' }}>
								<Box sx={{ display: 'flex', alignItems: 'center'}}>
									<Box
										sx={{
											width: 16,
											height: 16,
											bgcolor: record['labelColors'][0],
											mr: 1, // テキストとの間隔
										}}
									/>
									{record['labels'][0]}
								</Box>
							</TableCell>
						:
							<TableCell key={`'label1'-${i_}`} sx={{ verticalAlign: 'top' }}/>
					}
				</TableRow>
				{[...Array(row_span-1)].map((_, index) => {
					return (
						<TableRow role="checkbox">
							<TableCell key={"lavel"+String(index+2)+'-'+i_} sx={{ verticalAlign: 'top' }}>
								{(record['labels'] !== undefined && label_num > index+1) &&
									<Box sx={{ display: 'flex', alignItems: 'center'}}>
										<Box
											sx={{
												width: 16,
												height: 16,
												bgcolor: record['labelColors'][index+1],
												mr: 1, // テキストとの間隔
											}}
										/>
										{record['labels'][index+1]}
									</Box>
								}
							</TableCell>
						</TableRow>
					)
				})}
			</>
		)
	}

	const awaitPaging = async(type_name) => {
		let demo_ref = await collection(db,'DemoDetection')
		let demo_q;
		let demoData;
		let page_next = page;
		if (type_name === 'initialize') {
			demo_q = await query(demo_ref, orderBy("upImageTime", "desc"), limit(recordByPage))
			demoData = await getDocs(demo_q)
			page_next = 1
		} else if (type_name === 'endBefore') {
			demo_q = await query(demo_ref, orderBy("upImageTime", "desc"), endBefore(firstSnap), limitToLast(recordByPage))
			demoData = await getDocs(demo_q)
			page_next -= 1
			if (page_next < 1) {
				page_next = 1
			}
			if (demoData.docs !== undefined) {
				if (demoData.docs.length < recordByPage && 0 < demoData.docs.length) {
					console.log('initialize endBefore!')
					// console.log(demoData.docs.length)
					demo_q = await query(demo_ref, orderBy("upImageTime", "desc"), limit(recordByPage))
					demoData = await getDocs(demo_q)
				}
			}
		} else if (type_name === 'startAfter') {
			page_next += 1
			demo_q = await query(demo_ref, orderBy("upImageTime", "desc"), startAfter(lastSnap), limit(recordByPage))
			demoData = await getDocs(demo_q)
		}
		let in_dic = {...dic}
		let in_ids = []
		let updateData = []
		if (demoData.docs !== undefined) {
			if (demoData.docs.length > 0) {
				const firstSnap_next = demoData.docs[0];
				const lastSnap_next = demoData.docs[demoData.docs.length - 1];
				in_ids = new Array(demoData.docs.length)
				updateData = new Array(demoData.docs.length)
				const awaitGetJson = await httpsCallable(function_ini, 'getJson', { timeout: 550 * 1000 });
				const topPromises = [];
				for (let i_ = 0; i_ < demoData.docs.length; i_++) {
					const doc = demoData.docs[i_]
					const p = (async () => {
						let in_data = doc.data()
						// console.log(in_data)
						let in_id = doc.id
						// console.log('getID',in_id)
						const innerPromises = await fields.map(async (field) => {
							if (in_data[field] === undefined) {
								// console.log('getFine',field,storages[field])
								// console.log(in_data.fileName)
								try {
									let storageRef;
									let down_data;
									if (field.includes('Image')) {
										storageRef = ref(storage, `${storages[field]}/${in_data.fileName}`);
										down_data = await getDownloadURL(storageRef)
										in_data[field] = down_data
									} else {
										// console.log(`get ${storages[fields[1]]}/${in_data.fileName.split('.')[0]}.json`)
										await awaitGetJson({name: `${in_data.fileName.split('.')[0]}.json`}).then(async (result) => {
											let mes = result['data']
											// console.log(mes)
											if (mes.success !== undefined) {
												let dic_ = mes.success;
												let labels = []
												let colors = []
												Object.keys(dic_).map((label) => {
													labels.push(label)
													colors.push(dic_[label])
												})
												in_data['labels'] = labels
												in_data['labelColors'] = colors
											}
										})
									}
									// console.log(storageRef)
								} catch (e) {
									console.log(e)
								}
								//} else if (field === 'labels') {
									// const url = `https://storage.googleapis.com/myproducts-488109.firebasestorage.app/detectedImages/${in_data.fileName.split('.')[0]}.json`;
									// console.log(url)
									// try {
									// 	const response = await fetch(url);
									// 	const data = await response.json();
									// 	console.log(data)
									// } catch (e) {
									// 	console.log(e)
									// }
								// }
							}
						});

						await Promise.all(innerPromises);
						in_dic[in_id] = in_data
						in_ids[i_] = in_id
						updateData[i_] = in_data
					})();

					topPromises.push(p)
				}

				await Promise.all(topPromises);

				if (updateData.length > 0) {
					const awaitUpdate = await httpsCallable(function_ini, 'updateStore', { timeout: 550 * 1000 });
					await awaitUpdate(updateData).then(async (result) => {
						let mes = result['data']
						console.log(mes)
					})
				}

				// console.log(in_ids)
				// console.log(in_dic)
				// console.log(page_next)
				setPage(page_next)
				setFirstSnap(firstSnap_next)
				setLastSnap(lastSnap_next)
				setDicIds(in_ids)
				setDic(in_dic)
			}
		}
	}

	const fetchUpState = async() => {
		let fileName = uploadedImageRef.current
		// console.log('search',fileName)
		if (fileName !== '') {
			try {
				const fileRef = ref(storage, `${storages['detectedImageURL']}/${fileName}`)
				await getMetadata(fileRef);
				return {'success': 'uploaded upImage'}
			} catch (error) {
				console.log('still uploading upImage.')
				return  {'failed': error}
			}
		} else {
			console.log('NoneUploadImage')
			return {'failed': 'NoneUploadImage'}
		}
	}

	useEffect(() => {
		let timer;

		const start = async () => {
			// console.log(React.version)
			setDisabled(true)
			// console.log(disabled)

			await awaitPaging('initialize');
			
			setDisabled(false)
			const loop = async () => {
				const mes = await fetchUpState();
				console.log('fetchUpData')
				if (mes.success !== undefined) {
					setDisabled(true)
					setUpStatus(upImageStatus[3])
					setUploadedImage('')
					uploadedImageRef.current = '';
					await awaitPaging('initialize');
					setDisabled(false)
				}
				timer = setTimeout(loop, 20000);
			};

			loop();
		}
		start();

		return () => {
			clearTimeout(timer);
		};
	}, []);

	const uploadFile = async(event) => {
		setDisabled(true)

        if (event.target.files) {
          	reader.readAsDataURL(event.target.files[0]);
          	reader.onload = async function () {
				// console.log(reader.result)
				let image_data = reader.result
				// console.log(new Date('1991-04-12T12:04:09'))
				if (image_data !== null) {
					// console.log('calculate!')
					// let exif = await getImageInfo(image_data)
					setAlign(0)
					setImage(image_data)
				} else {
					alert('ファイルが読み込まれませんでした。再度お試しください')
					setDisabled(false)
				}
			}
			reader.onerror = function (error) {
              // console.log('Error: ', error);
              alert(error)
              setDisabled(false)
          	};
		}

		setDisabled(false)
	}

	const rotateImage = async () => {
        let in_align = align - 90
        if (in_align < 0) {
            in_align += 360
        }

        // console.log(in_align)
        setAlign(in_align)
    }

	const upImage = async () => {
		setUpStatus(upImageStatus[1])
		setDisabled(true)

		try {
			const rawBase64 = image;
    		const img = new Image();

			img.src = rawBase64;
    		await new Promise(resolve => (img.onload = resolve));

			var w = img.width;
			var h = img.height;
			var n_w = 0
			var n_h = 0
			var cat_ = 1000

			// console.log(w,h)
			if (w > h) {
				let rate = cat_ / h
				n_h = cat_
				n_w = Math.ceil(w * rate)
			} else {
				let rate = cat_ / w
				n_w = cat_
				n_h = Math.ceil(h * rate)
			}

			var s_x = Math.ceil((n_w - cat_) / 2)
			var s_y = n_h-cat_
			var in_al = align

			// console.log(w,h,in_al)
			// console.log('converting!', n_w, n_h, cat_, cat_)

			// アップされた画像をcanvasに保存
			const originalCanvas = documentInstance.createElement('canvas');
			originalCanvas.width = w;
			originalCanvas.height = h;
			const oCtx = originalCanvas.getContext('2d');
			oCtx.drawImage(img, 0, 0, w, h);

			// Pica でリサイズ（実質は drawImage＋補完をやる）
			// const p = pica;
			const resizedCanvas = documentInstance.createElement('canvas');
			resizedCanvas.width = n_w;
			resizedCanvas.height = n_h;
			await pica.resize(originalCanvas, resizedCanvas);

			// 画像を切り取り
			const rotatedCanvas = documentInstance.createElement('canvas');
			const rCtx = rotatedCanvas.getContext('2d');
			rotatedCanvas.width = cat_;
			rotatedCanvas.height = cat_;
			rCtx.drawImage(resizedCanvas,
				s_x, s_y, cat_, cat_, 0, 0, cat_, cat_);
			
			// 切り取った画像をcanvasに保存
			rCtx.save();

			// 画像を回転
			rCtx.translate(cat_ / 2, cat_ / 2);
			rCtx.rotate((align * Math.PI) / 180);
			rCtx.drawImage(rotatedCanvas, -cat_ / 2, -cat_ / 2);

			// 回転された状態を戻す
			rCtx.restore();

			// Base64 取得
			const finalBase64 = rotatedCanvas.toDataURL('image/jpeg');

			// console.log('uploaded!', finalBase64);
			const awaitTestUploader = await httpsCallable(function_ini, 'uploadImage', { timeout: 550 * 1000 });

			let today_on = new Date()
			let year_in = today_on.getFullYear();
			let month_in = ("0" + (today_on.getMonth() + 1)).slice(-2);
			let date_in = ("0" + today_on.getDate()).slice(-2);
			let hours_in = ("0" + today_on.getHours()).slice(-2);
			let minutes_in = ("0" + today_on.getMinutes()).slice(-2);
			let second_in = ("0" + today_on.getSeconds()).slice(-2);
			console.log(year_in + '-' + month_in + '-' + date_in + 'T' + hours_in + ':' + minutes_in + ':' + second_in + 'Z')

			let insertData = {}
			insertData['image'] = finalBase64
			insertData['upImageTime'] = year_in + '-' + month_in + '-' + date_in + 'T' + hours_in + ':' + minutes_in + ':' + second_in + 'Z'//Timestamp.fromDate(new Date())
			
			await awaitTestUploader(insertData).then(async (result) => {
				let mes = result['data']
				// console.log(mes)
				if (mes.success !== undefined) {
					setUploadedImage(mes.success)
					uploadedImageRef.current = mes.success
					// console.log('set',mes.success)
					setUpStatus(upImageStatus[2])
				}
			})

			setAlign(0)
			setImage(finalBase64)
			setImage('')
			// console.log('uploaded!')
			await awaitPaging('initialize');
			setDisabled(false)
		} catch (err) {
			console.error(err);
			setDisabled(false)
		}
	}

	const downloadFolder = async () => {
		setDisabled(true)

		const zip = new JSZip();
		const folder = zip.folder("Sample画像");   // フォルダ名

		// フォルダ内のファイル一覧
		const files = [
			"/Sample/image01.jpg",
			"/Sample/000000579158.jpg",
			"/Sample/000000481390.jpg",
			"/Sample/000000430073.jpg",
			"/Sample/000000331799.jpg",
			"/Sample/000000303818.jpg",
			"/Sample/000000205776.jpg"
		];

		for (const fileUrl of files) {
			const response = await fetch(fileUrl);
			const blob = await response.blob();

			const fileName = fileUrl.split("/").pop();
			folder.file(fileName, blob);
		}

		// ZIP生成
		const content = await zip.generateAsync({ type: "blob" });

		// ダウンロード
		saveAs(content, "Sample画像.zip");
		setDisabled(false)
	};

	const glow = keyframes`
		0% {
			transform: scale(0.2);
			opacity: 0.8;
		}
		70% {
			transform: scale(2.2);
			opacity: 0.5;
		}
		100% {
			transform: scale(2.2);
			opacity: 0;
		}`
	;

	const pulse1 = keyframes`
		0% {
			transform: scale(1.8);
		}
		50% {
			transform: scale(1);
		}
		100% {
			transform: scale(1);
		}`
	;

	const pulse2 = keyframes`
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.8);
		}
		100% {
			transform: scale(1);
		}`
	;

	const pulse3 = keyframes`
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1);
		}
		100% {
			transform: scale(1.8);
		}`
	;

	// if (!disabled) {
		return (
			<div>
				<Grid
					container
					spacing={0}
					direction="row"
					alignItems="center"
					sx={{
						textAlign: "center",
						justifyContent: {
							xs: "initial",
      						sm: "space-between"
						},
						flexWrap: {
							xs: "wrap",
							sm: "nowrap"
						}
					}}
				>
					<Grid
						size={{xs: 3, sm:2}}
						item
						sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}
					>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>
							画像を保存
						</Typography>
						<Box
							alignItems="center"
							sx={{
								position: "relative",
								width: "100%",
								height: "6vw",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Box
								sx={{
									position: "absolute",
									width: "100%",
									height: "100%",
									borderRadius: "50%",
									...(upStatus === upImageStatus[1] && {
										background:
											"radial-gradient(circle, rgba(255,255,0,0.9) 0%, rgba(255,255,0,0.4) 30%, rgba(255,255,0,0) 70%)",
										animation: `${glow} 1.5s infinite`,
									})
								}}
							/>
							<Storage sx={{ fontSize: "6vw"}} />
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
								mb: '10px'
							}}
						>
							Storage
						</Typography>
					</Grid>
					<Grid
						size={{xs: 3, sm:1}}
						item
						sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}
					>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%"
							}}
						>
							<ArrowForward
								sx={{
									fontSize: "3vw",
									...(upStatus === upImageStatus[1] && {
										animation: `${pulse1} 1s infinite ease-in-out`
									})
								}}
							/>
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
					</Grid>
					<Grid size={{xs: 3, sm:1}} item sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
							}}
						>
							通知送信
						</Typography>
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%"
							}}
						>
							<ArrowForward
								sx={{
									fontSize: "3vw",
									...(upStatus === upImageStatus[1] && {
										animation: `${pulse2} 1s infinite ease-in-out`
									})
								}}
							/>
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
								mb: '10px'
							}}
						>
							Eventarc
						</Typography>
					</Grid>
					<Grid size={{xs: 3, sm:1}} item sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%"
							}}
						>
							<ArrowForward
								sx={{
									fontSize: "3vw",
									...(upStatus === upImageStatus[1] && {
										animation: `${pulse3} 1s infinite ease-in-out`
									})
								}}
							/>
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
					</Grid>
					<Grid
						size={{xs: 3, sm:2}}
						item
						sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}
					>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
							}}
						>
							学習機で検出
						</Typography>
						<Box
							alignItems="center"
							sx={{
								position: "relative",
								width: "100%",
								height: "6vw",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Box
								sx={{
									position: "absolute",
									width: "100%",
									height: "100%",
									borderRadius: "50%",
									...(upStatus === upImageStatus[2] && {
										background:
											"radial-gradient(circle, rgba(255,255,0,0.9) 0%, rgba(255,255,0,0.4) 30%, rgba(255,255,0,0) 70%)",
										animation: `${glow} 1.5s infinite`,
									})
								}}
							/>
							<SmartToy sx={{ fontSize: "6vw"}} />
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
								mb: '10px'
							}}
						>
							CloudRun
						</Typography>
					</Grid>
					<Grid
						size={{xs: 2, sm:1}}
						item
						sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}
					>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%"
							}}
						>
							<ArrowForward
								sx={{
									fontSize: "3vw",
									...(upStatus === upImageStatus[2] && {
										animation: `${pulse1} 1s infinite ease-in-out`
									})
								}}
							/>
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
					</Grid>
					<Grid size={{xs: 2, sm:1}} item sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
							}}
						>
							Webに送信
						</Typography>
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%"
							}}
						>
							<ArrowForward
								sx={{
									fontSize: "3vw",
									...(upStatus === upImageStatus[2] && {
										animation: `${pulse2} 1s infinite ease-in-out`
									})
								}}
							/>
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
								mb: '10px'
							}}
						>
							　
						</Typography>
					</Grid>
					<Grid size={{xs: 2, sm:1}} item sx={{
							flexShrink: {
								xs: 0,
								sm: 1
							}
						}}>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								height: "100%"
							}}
						>
							<ArrowForward
								sx={{
									fontSize: "3vw",
									...(upStatus === upImageStatus[2] && {
										animation: `${pulse3} 1s infinite ease-in-out`
									})
								}}
							/>
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								textDecoration: 'none',
							}}
						>　</Typography>
					</Grid>
					<Grid
						size={{xs: 3, sm:2}}
						item
					>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
							}}
						>
							以下に表示
						</Typography>
						<Box
							alignItems="center"
							sx={{
								position: "relative",
								width: "100%",
								height: "6vw",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Box
								sx={{
									position: "absolute",
									width: "100%",
									height: "100%",
									borderRadius: "50%",
									...(upStatus === upImageStatus[3] && {
										background:
											"radial-gradient(circle, rgba(255,255,0,0.9) 0%, rgba(255,255,0,0.4) 30%, rgba(255,255,0,0) 70%)",
										animation: `${glow} 1.5s infinite`,
									})
								}}
							/>
							<LaptopMac sx={{ fontSize: "6vw"}} />
						</Box>
						<Typography
							variant="body1"
							noWrap
							// href="#app-bar-with-responsive-menu"
							sx={{
								// display: 'flex',
								// fontFamily: 'Comic Sans MS',
								// fontWeight: 700,
								// letterSpacing: '.3rem',
								color: 'inherit',
								overflow: 'visible',
								textDecoration: 'none',
								mb: '10px'
							}}
						>
							Web
						</Typography>
					</Grid>
				</Grid>
				{!disabled ? 
					<>
						<div style={{display: 'flex', alignItems: 'start', flexDirection: 'column'}}>
							<Button
								variant='contained'
								onClick={async () => {
										await downloadFolder();
									}}
								sx={{my: '5px'}}
								endIcon={<DownloadForOffline />}
							>
								Sample取得
							</Button>
							<div>
								<Button
									variant="contained"
									endIcon={<CameraAlt />}
									sx={{marginBottom: '5px'}}
								>
									<input
										type="file"
										className="inputFileBtnHide"
										accept="image/png, image/jpeg"
										// capture="camera"
										onChange={uploadFile}
										filesystem
									/>
								</Button>
							</div>
						</div>
						{image !== '' &&
							<>
								<Button
									variant="contained"
									onClick={upImage}
									endIcon={<UpIcon />}
								>
									Storageに画像をアップ
								</Button>
								<Button
									className='rotate-icon'
									onClick={rotateImage}
									endIcon={<ReplayOutlined />}
								>
									画像を右回転
								</Button>
							</>
						}
						{image !== '' ?
								<div
									className='reviewImage' 
									style={{backgroundImage: `url(${image})`, transform: `rotate(${align}deg)`}}
								/>
							:
								<Paper sx={{ width: '100%', overflow: 'hidden', marginTop: '3px' }}>
									<Pagination
										count={page}
										page={page}
										renderItem={(item) => {
											if (item.type === "page" && item.page !== page) {
												return null;
											}
											return (
												<PaginationItem
													slots={{ previous: ArrowBack, next: ArrowForward }}
													{...item}
													disabled={false}
													onClick={async() => {
														setDisabled(true)
														if (item.type === "previous") {
															await awaitPaging('endBefore')
														} else if (item.type === "next") {
															await awaitPaging('startAfter')
														}
														setDisabled(false)
													}}
												/>
											)
										}}
										showFirstButton={false}
										showLastButton={false}
									/>
									<TableContainer sx=
										{{
											maxHeight: 440,
											width: '90%',
											display: 'flex',
											marginLeft: 'auto',
											marginRight: 'auto'
										}}
									>
										<Table stickyHeader aria-label="sticky table">
											<TableHead>
												<TableRow>
												{columns.map((column) => (
													<TableCell
														key={column}
													>
														{column}
													</TableCell>
												))}
												</TableRow>
											</TableHead>
											<TableBody>

												{dicIds.map((id) => {
													// console.log('draw')
													// console.log(dic[id])
													return createRecordTable(dic[id], id)
												})}

											</TableBody>
										</Table>
									</TableContainer>
								</Paper>
						}
					</>
				:
					<Loading width={'300'} />
			}
			</div>
		)
	// } else {
	// 	return <Loading width={'300'} />
	// }
};

export default ShowMaciene;