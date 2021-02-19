import React, { Component } from 'react';
import './App.css';

const RTCConfig = {
  "iceServers": [{
    url: 'stun:stun.l.google.com:19302'
  }]
};
class App extends Component {
  constructor (props) {
    super(props);
    this.state = {
      input: '',
    };
    this.signalData = { "desc": null, "ice": [] };
    this.peerConnection = null;
    this.localVideo = React.createRef(null);
    this.remoteVideo = React.createRef(null);
    this.localStream = null;
  }

  getPeerConnection = () => {
    console.log('getPeerConnection')
    this.peerConnection = new RTCPeerConnection(RTCConfig);
    this.peerConnection.onaddstream = this.gotRemoteStream;
    this.peerConnection.onicecandidate = this.gotIceCandidate;
    this.peerConnection.oniceconnectionstatechange = this.onConnectionStatusChange;
    this.peerConnection.onsignalingstatechange = (event) => { 
      console.log("Signaling change", event); 
    }
  }

  getMediaStream = (callback) => {
    console.log('getMediaStream')
    navigator.mediaDevices.getDisplayMedia(
      {
        audio: true,
        video: true
      }).then((stream) => {
        this.localStream = stream;
        callback(stream);
      }).catch(function (error) {
        console.log("getUserMedia error: ", error);
      });
  }

  joinSession = () => {
    const {input} = this.state;
    console.log('joinSession');
    if (this.peerConnection == null) {
      this.getPeerConnection();
    }
    // console.log(txtBox.val().trim())
    var sigdata = JSON.parse(input.trim());
    if (sigdata["desc"] === "") {
      alert("Please enter the offer");
      return;
    }
    // cpyRow.show();
    this.getMediaStream(this.createAnswer);
  }

  createOffer = (stream) => {
    console.log('create offer');
    this.localVideo.current.srcObject = stream;
    this.peerConnection.addStream(stream);
    this.peerConnection.createOffer(this.onConnection, this.handleError);
    // txtBox.popover('show');
    // cpyRow.show();
  }

  initiateOffer = () => {
    console.log('initiateOffer')
    if (this.peerConnection == null) {
      this.getPeerConnection();
    }
    this.getMediaStream(this.createOffer);
  }

  onConnection = (desc) => {
    console.log("Description is " + desc.sdp);
    this.peerConnection.setLocalDescription(desc);
    this.signalData["desc"] = desc;
    //Change the event on click of Join Button to Complete Handshake on Initiator Side
    this.handleJoin = () => {
      this.completeHandshake();
    }
  }

  createAnswer = (stream) => {
    const {input} = this.state;
    console.log('create answer');
    const sigdata = JSON.parse(input.trim());
    this.localVideo.current.srcObject = stream;
    this.peerConnection.addStream(stream);
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(sigdata["desc"]), function () { console.log("Success"); }, this.handleError);
    this.peerConnection.createAnswer(this.sendReply, this.handleError);
    this.addIceCandidates(sigdata["ice"]);
    // txtBox.popover("show");
  }

  completeHandshake = () => {
    const {input} = this.state;
    console.log("Inside complete handshake");
    let sigdata = input.trim();
    sigdata = JSON.parse(sigdata);
    if (!sigdata["desc"]) {
      alert("Please enter the answer");
      return;
    }
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(sigdata["desc"]), function () { console.log("Success"); }, this.handleError);
    this.addIceCandidates(sigdata["ice"]);

  }

  sendReply = (desc) => {
    console.log('send reply');
    this.peerConnection.setLocalDescription(desc);
    this.signalData["desc"] = desc;
    console.log(JSON.stringify(this.signalData));
    // this.cpyJumbRow.show();
    // cpyJumBtn.popover('show');
  }


  gotIceCandidate = (event) => {
    console.log('gotIceCandidate');
    if (event.candidate) {
      this.signalData["ice"].push(event.candidate);
      this.setState({input: JSON.stringify(this.signalData)})
      // document.getElementById("desc").value = JSON.stringify(signalData);
    }
  }

  addIceCandidates = (canArr) => {
    console.log('add ice candidates', canArr);
    for (var i in canArr) {
      this.peerConnection.addIceCandidate(new RTCIceCandidate(canArr[i]));
    }
  }

  handleError = (err) => {
    console.log("Error occured " + err);
  }


  closeCall = () => {
    console.log('close call');
    this.peerConnection.close();
    //peerConnection=null;

    // txtBox.popover('hide');
    // txtBox.val('');
    this.localVideo.current.pause();
    this.remoteVideo.current.pause();
    this.localStream = null;
    // $(localVideo).hide();
    // showModal();
  }

  showModal = () => {
    // $("#textModal").modal('show');
  }

  hideModal = () => {
    // $("#textModal").modal('hide');
  }

  onConnectionStatusChange = (event) => {
    switch (this.peerConnection.iceConnectionState) {
      case 'checking':
        console.log('Connecting to peer...');
        break;
      case 'connected': // on caller side
        console.log('Connection established.');
        // $('#textModal').modal('hide');
        // $("#localVideo").show();
        // $("#hangupdiv").show();
        break;
      case 'disconnected':
        console.log('Disconnected.');
        this.closeCall();
        break;
      case 'failed':
        console.log('Failed.');
        break;
      case 'closed':
        console.log('Connection closed.');
        this.peerConnection = null;
        this.handleJoin = () => {
          this.joinSession();
        }
        break;
      default:
        console.log('sdfsfdsfsdfsdf')
    }
  }

  gotRemoteStream = (event) => {
    console.log("Received remote stream");
    this.remoteVideo.current.srcObject = event.stream;
  }

  handleCall = () => {
    this.initiateOffer();
  }

  handleJoin = () => {
    this.joinSession();
  }

  render() {
    const {input} = this.state;

    return (
      <div className="App">
        <button onClick={this.handleCall}>
          call
        </button>
        <button onClick={this.handleJoin}>
          join
        </button>
        <textarea
          value={input} 
          placeholder='copy'
          onChange={(e) => this.setState({input: e.target.value})}
        />
        <div>
          <span>local</span>
          <video
            autoPlay
            ref={this.localVideo}
            width={100}
            height={100}
          />
        </div>
        <div>
          <span>remote</span>
          <video
            autoPlay
            ref={this.remoteVideo}
            width={100}
            height={100}
          />
        </div>
      </div>
    );
  }
}

export default App;
