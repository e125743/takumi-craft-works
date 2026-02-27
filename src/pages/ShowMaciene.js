import getFirebaseIni from '../firebase';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import { Button,IconButton } from '@mui/material';
import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
// import {Jimp}from 'jimp';
import UpIcon from '@mui/icons-material/FileUpload';
import { Buffer } from 'buffer';
import { httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";
// import React from 'react';

const flag = typeof window !== 'undefined';
let function_instance = null
let function_ini = null;
let reader = null;
let documentInstance = null;
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
	reader = new FileReader();
	window.Buffer = window.Buffer || Buffer;
	documentInstance = document
}

const ShowMaciene = () => {
	const [disabled, setDisabled] = useState(false);
	const [image, setImage] = useState('');
	const [align, setAlign] = useState(0);

	const pica = require('pica')()

	// useEffect(() => {
	// 	// console.log(React.version)
	// 	setDisabled(true)
	// 	console.log(disabled)
	// }, []);

	const uploadFile = async(event) => {
		setDisabled(true)

        if (event.target.files) {
          	reader.readAsDataURL(event.target.files[0]);
          	reader.onload = async function () {
				// console.log(reader.result)
				let image_data = reader.result
				// console.log(new Date('1991-04-12T12:04:09'))
				if (image_data != null) {
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
			
			await awaitTestUploader({'image': finalBase64}).then(async (result) => {
				let mes = result['data']
				console.log(mes)
			})

			setAlign(0)
			setImage(finalBase64)
			// setImage('')
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
					{image != '' &&
						<Button
							className='rotate-icon'
							onClick={rotateImage}
							endIcon={<ReplayOutlinedIcon />}
						>
							画像を右回転
						</Button>
					}
				</div>
				{image != '' &&
					<div
						className='reviewImage' 
						style={{backgroundImage: `url(${image})`, transform: `rotate(${align}deg)`}}
					/>
				}
				{image != '' ?
						<Button
							variant="contained"
							onClick={upImage}
							endIcon={<UpIcon />}
						>
							画像をアップロード
						</Button>
					:
						<p>あああ</p>
				}
			</div>
		)
	} else {
		return <Loading width={'300'} />
	}
};

export default ShowMaciene;