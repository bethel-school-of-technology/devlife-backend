const nodeMailer = require("nodemailer");

const defaultEmailData = { from: "noreply@node-react.com" };

exports.sendEmail = emailData => {
  const transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
<<<<<<< HEAD
      user: "masterjupiter2015@gmail.com",
      pass: "kshzlmomlthllktq"
=======
      user: "devlifesm@gmail.com",
      pass: "Devlife-4"
>>>>>>> 5a29abcdc912da26fea49c54d7c379b8f8b039b4
    }
  });
  return transporter
    .sendMail(emailData)
    .then(info => console.log(`Message sent: ${info.response}`))
    .catch(err => console.log(`Problem sending email: ${err}`));
};
