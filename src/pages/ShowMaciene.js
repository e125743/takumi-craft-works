import getFirebaseIni from '../firebase';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import { Button,IconButton, Box } from '@mui/material';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
// import {Jimp} from 'jimp';
import UpIcon from '@mui/icons-material/FileUpload';
import { Buffer } from 'buffer';
import { httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";
import MachieneImage from '../images/yolov8-test.jpg';
import { Timestamp, getDocs, orderBy, query, collection } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
// import React from 'react';

const columns = ['origine', 'detected', 'labels']
const fields = ['origineImageURL', 'detectedImageURL']
const storages = {
	'origineImageURL': 'origineImages',
	'detectedImageURL': 'detectedImages'
}

const flag = typeof window !== 'undefined';
let function_instance = null
let function_ini = null;
let reader = null;
let documentInstance = null;
let db = null
let storage = null
if (flag) {
	function_instance = getFirebaseIni()
	console.log('Appcheck')
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
			console.log("App Check Token:", tokenResponse.token);
			console.log("Expires at:", new Date(tokenResponse.expireTimeMillis));
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

	const pica = require('pica')()

	const createRecordTable = (record) => {
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
						console.log(field.includes('Image'))
						console.log(record[field])
						return field.includes('Image') ? (
								<TableCell key={field} rowSpan={row_span}>
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
							) : (
								<TableCell key={field} rowSpan={row_span}/>
						)
					})}
					{record['labels'] !== undefined ?
							<TableCell key='label1' sx={{ verticalAlign: 'top' }}>
								<Box sx={{ display: 'flex', alignItems: 'center'}}>
									{record['labels'][0]}
									<Box
										sx={{
											width: 16,
											height: 16,
											bgcolor: 'red',
											ml: 1, // テキストとの間隔
										}}
									/>
								</Box>
							</TableCell>
						:
							<TableCell key='label1' sx={{ verticalAlign: 'top' }}/>
					}
				</TableRow>
				{[...Array(row_span-1)].map((_, index) => {
					return (
						<TableRow role="checkbox">
							<TableCell key="lavel2" sx={{ verticalAlign: 'top' }}>
								{(record['labels'] !== undefined && label_num > index+1) &&
									<Box sx={{ display: 'flex', alignItems: 'center'}}>
										{record['labels'][index+1]}
										<Box
											sx={{
												width: 16,
												height: 16,
												bgcolor: 'red',
												ml: 1, // テキストとの間隔
											}}
										/>
									</Box>
								}
							</TableCell>
						</TableRow>
					)
				})}
			</>
		)
	}

	useEffect(() => {
		(async () => {
			// console.log(React.version)
			setDisabled(true)
			console.log(disabled)

			let demo_ref = await collection(db,'DemoDetection')
			let demo_q = await query(demo_ref)//, orderBy("created_at", "desc"))//, firestore.limit(3))
			let demoData = await getDocs(demo_q)
			let in_dic = {}
			let in_ids = []
			let updateData = []
			if (demoData.docs !== undefined) {
				const topPromises = await demoData.docs.map(async (doc) => {
					let in_data = doc.data()
					console.log(in_data)
					let in_id = doc.id
					console.log('getID',in_id)
					const innerPromises = await fields.map(async (field) => {
						if (in_data[field] === undefined) {
							console.log('getFine',field,storages[field])
							console.log(in_data.fileName)
							const storageRef = ref(storage, `${storages[field]}/${in_data.fileName}`);
							console.log(storageRef)
							try {
								in_data[field] = await getDownloadURL(storageRef)
								console.log(in_data[field])
								updateData.push(in_data)
							} catch (e) {
								console.log(e)
							}
						}
					});

					await Promise.all(innerPromises);
					in_dic[in_id] = in_data
					in_ids.push(in_id)
				})

				await Promise.all(topPromises);

				if (updateData.length > 0) {
					const awaitUpdate = await httpsCallable(function_ini, 'updateStore', { timeout: 550 * 1000 });
					await awaitUpdate(updateData).then(async (result) => {
						let mes = result['data']
						console.log(mes)
					})
				}

				console.log(in_ids)
				console.log(in_dic)
				setDicIds(in_ids)
				setDic(in_dic)
			}
			setDisabled(false)
		})();
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
					console.log('calculate!')
					// let exif = await getImageInfo(image_data)
					setAlign(0)
					setImage(image_data)
				} else {
					alert('ファイルが読み込まれませんでした。再度お試しください')
					setDisabled(false)
				}
			}
			reader.onerror = function (error) {
              console.log('Error: ', error);
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

        console.log(in_align)
        setAlign(in_align)
    }

	const upImage = async () => {
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

			console.log(w,h)
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

			console.log(w,h,in_al)
			console.log('converting!', n_w, n_h, cat_, cat_)

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

			console.log('uploaded!', finalBase64);
			const awaitTestUploader = await httpsCallable(function_ini, 'uploadImage', { timeout: 550 * 1000 });

			// let today_on = new Date()
			// let year_in = today_on.getFullYear();
			// let month_in = ("0" + (today_on.getMonth() + 1)).slice(-2);
			// let date_in = ("0" + today_on.getDate()).slice(-2);
			// let hours_in = ("0" + today_on.getHours()).slice(-2);
			// let minutes_in = ("0" + today_on.getMinutes()).slice(-2);
			// let second_in = ("0" + today_on.getSeconds()).slice(-2);
			// console.log(year_in + '-' + month_in + '-' + date_in + 'T' + hours_in + ':' + minutes_in + ':' + second_in + 'Z')

			let insertData = {}
			insertData['image'] = finalBase64
			insertData['upImageTime'] = Timestamp.fromDate(new Date())
			
			await awaitTestUploader(insertData).then(async (result) => {
				let mes = result['data']
				console.log(mes)
			})

			setAlign(0)
			setImage(finalBase64)
			setImage('')
			console.log('uploaded!')
			setDisabled(false)
		} catch (err) {
			console.error(err);
			setDisabled(false)
		}
	}

	if (!disabled) {
		return (
			<div>
				<div>
					<Button
						variant="contained"
						endIcon={<CameraAltIcon />}
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
					{image !== '' &&
						<Button
							className='rotate-icon'
							onClick={rotateImage}
							endIcon={<ReplayOutlinedIcon />}
						>
							画像を右回転
						</Button>
					}
				</div>
				{image !== '' &&
					<div
						className='reviewImage' 
						style={{backgroundImage: `url(${image})`, transform: `rotate(${align}deg)`}}
					/>
				}
				{image !== '' ?
						<Button
							variant="contained"
							onClick={upImage}
							endIcon={<UpIcon />}
						>
							画像をアップロード
						</Button>
					:
						<Paper sx={{ width: '100%', overflow: 'hidden', marginTop: '3px' }}>
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

										<TableRow role="checkbox">
											<TableCell rowSpan={3}>
												<Box
													component="img"
													src={MachieneImage}
													alt="Logo"
													className='linkImage'
													sx={{
														width: '25vw',
														height: '25vw',
													}}
												/>
											</TableCell>
											<TableCell rowSpan={3}>
												<Box
													component="img"
													src={MachieneImage}
													alt="Logo"
													className='linkImage'
													sx={{
														width: '25vw',
														height: '25vw',
													}}
												/>
											</TableCell>
											<TableCell key='label1' sx={{ verticalAlign: 'top' }}>
												<Box sx={{ display: 'flex', alignItems: 'center'}}>
													値3-1
													<Box
														sx={{
															width: 16,
															height: 16,
															bgcolor: 'red',
															ml: 1, // テキストとの間隔
														}}
													/>
												</Box>
											</TableCell>
										</TableRow>

										<TableRow role="checkbox">
											<TableCell key="lavel2" sx={{ verticalAlign: 'top' }}>
												<Box sx={{ display: 'flex', alignItems: 'center'}}>
													値3-1
													<Box
														sx={{
															width: 16,
															height: 16,
															bgcolor: 'red',
															ml: 1, // テキストとの間隔
														}}
													/>
												</Box>
											</TableCell>
										</TableRow>
										<TableRow role="checkbox">
											<TableCell key="lavel3" sx={{ verticalAlign: 'top' }}>
												<Box sx={{ display: 'flex', alignItems: 'center'}}>
													値3-1
													<Box
														sx={{
															width: 16,
															height: 16,
															bgcolor: 'red',
															ml: 1, // テキストとの間隔
														}}
													/>
												</Box>
											</TableCell>
										</TableRow>

										{dicIds.map((id) => {
											console.log('draw')
											console.log(dic[id])
											return createRecordTable(dic[id])
										})}

									</TableBody>
								</Table>
							</TableContainer>
						</Paper>
				}
			</div>
		)
	} else {
		return <Loading width={'300'} />
	}
};

export default ShowMaciene;