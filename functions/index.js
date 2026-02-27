/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
// 設定してからimportしたモジュールに適用される
// https://firebase.google.com/docs/reference/functions/2nd-gen/node/firebase-functions.globaloptions.md#globaloptions_interface
setGlobalOptions({
    maxInstances: 10,
    region: 'asia-northeast1',
    memory: '1GB',
    timeoutSeconds: 540
});

const functions = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
admin.initializeApp();

const photoPaths = ['origineImages', 'detectedImages']

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.

async function awaitUploadImage(image, name, photoPath) {
    try {
        console.log('start awaitUploadImage')
        const file = admin
                    .storage()
                    .bucket()
                    .file(`${photoPath}/${name}`)
        console.log('start fileUploader')
        console.log(image)
        // if (type == 'jpeg') {
        let time = Date.now()
        const base64EncodedImageString_load = image.replace(
            /^data:image\/\w+;base64,/,
            '',
        )
        console.log('replace_base64:', ((Date.now() - time) / (1000*60)).toString());

        time = Date.now()
        let imageBuffer_load = Buffer.from(base64EncodedImageString_load, 'base64')

        console.log('image_buffer:', ((Date.now() - time) / (1000*60)).toString());

        time = Date.now()
        await file.save(imageBuffer_load, { metadata: { contentType: 'image/jpeg' } })
        return {message: 'success'}
    } catch (error) {
        console.log(error)
        return {message: 'imageUplodeError'}
    }
}

async function awaitInsertFirestore(data, collection, root, overWrite=false) {
    try {
        // コレクションにdocを追加
        if (root == '') {
            await admin.firestore().collection(collection).add(data)
        // 特定のdocを更新
        } else {
            // docのデータを全て書き換える
            if (overWrite) {
                await admin.firestore().collection(collection).doc(root).set(data, { merge: false })
            // docのfieldだけを更新（更新に関係ないfieldはそのまま残す）
            } else {
                await admin.firestore().collection(collection).doc(root).set(data, { merge: true })
            }
        }
        return {message: 'success'}
    } catch (error) {
        console.log(error)
        return {message: 'fireStoreError'}
    }
}

exports.uploadImage = onCall(
    {
        // リクエスト出来るドメインを制限
        cors: ["https://myproducts-488109.web.app", "https://myproducts-488109.firebaseapp.com", "http://localhost:3000"],
        // AppCheck（認証されたドメインから以外のリクエストを拒否）
        enforceAppCheck: true
    },
    async (data) => {
        try {
            let ref = await admin.firestore().collection('DemoDetection').doc()
            let fileName = ref.id + '.jpg'
            console.log('start uploadImage')
            let dic_ = data.data
            console.log(dic_)
            await awaitUploadImage(dic_['image'], fileName, photoPaths[0])
            delete dic_['image']
            dic_['fileName'] = fileName
            dic_[photoPaths[0]] = true
            await awaitInsertFirestore(dic_, 'DemoDetection', fileName)
            return {message: 'success'}
        } catch (error) {
            console.log(error)
            return {message: 'uploadError'}
        }
})

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
