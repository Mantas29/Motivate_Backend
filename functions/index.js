// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');
admin.initializeApp();

// Take the text parameter passed to this HTTP endpoint and insert it into 
// Firestore under the path /messages/:documentId/original
exports.addMessage = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into Firestore using the Firebase Admin SDK.
  const writeResult = await admin.firestore().collection('messages').add({original: original});
  // Send back a message that we've successfully written the message
  res.json({result: `Message with ID: ${writeResult.id} added.`});
});

// Listens for new messages added to /messages/:documentId/original and creates an
// uppercase version of the message to /messages/:documentId/uppercase
exports.makeUppercase = functions.firestore.document('/messages/{documentId}')
    .onCreate((snap, context) => {
      // Grab the current value of what was written to Firestore.
      const original = snap.data().original;

      // Access the parameter `{documentId}` with `context.params`
      functions.logger.log('Uppercasing', context.params.documentId, original);
      
      const uppercase = original.toUpperCase();
      
      // You must return a Promise when performing asynchronous tasks inside a Functions such as
      // writing to Firestore.
      // Setting an 'uppercase' field in Firestore document returns a Promise.
      return snap.ref.set({uppercase}, {merge: true});
    });

exports.addQuote = functions.https.onRequest(async (req, res) => {
  
  const text = req.body.text;
  const keywords = req.body.keywords;

  if(text == null || typeof text !== "string") {
    res.status(400).send("Quote text not provided or is not string type");
    return;
  }

  if(keywords == null || !keywords.every(i => (typeof i === "string"))) {
    res.status(400).send("Quote keywords not provided or are not string type");
    return;
  }

  await admin.firestore().collection("Quotes").add({
    text: text,
    keywords: keywords
  });

  functions.logger.log("Added quote.", text, keywords);

  res.status(200).send("success");
})

exports.getQuote = functions.https.onRequest(async (req, res) => {

  const query = Object.entries(req.query);
  const quotesRef = admin.firestore().collection("Quotes");
  const snapshot = await quotesRef.get();

  var selectedQuote = "";

  var highestScore = 0;
  var currentScore = 0;

  snapshot.forEach(doc => {
    currentScore = 0;
    doc.data().keywords.forEach(keyword => {
      for (const [key, value] of query) {
        if(key.toLowerCase() == keyword.toLowerCase()) {
          currentScore += value;
        }
      }
    });

    if(currentScore > highestScore || (currentScore == highestScore && Math.random() > 0.5)) {
      highestScore = currentScore;
      selectedQuote = doc.data().text;
    }
  });

  res.status(200).send(selectedQuote);
})