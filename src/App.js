import React, { Component } from 'react';
import {writeData, readData, clearData} from './firebase/database';
import './App.css';

const RTCConfig = {
  "iceServers": [{
    url: 'stun:stun.l.google.com:19302'
  }]
};

const ROLES = {
  HOST: 'host',
  CLIENT: 'client',
};
class App extends Component {
  constructor (props) {
    super(props);
    this.state = {
      input: '',
      role: '',
      roomInput: '',
      dataFromServer: {},
      isOffer: false,
      isAnswer: false,
      isHostReady: false,
    };
    this.signalData = { "desc": null, "ice": [] };
    this.peerConnection = null;
    this.localVideo = React.createRef(null);
    this.remoteVideo = React.createRef(null);
    this.localStream = null;
    this.perfArr = [];
    this.lastPerfStamp = 0;
    this.timeOut = null;
    this.updateServerTimer = null;
  }

  clientUpdate = () => {
    const {dataFromServer, isOffer} = this.state;
    console.log('GET OFFER', dataFromServer)
    if (dataFromServer?.host?.offer && !isOffer) {
      this.setState({isOffer: true});
      this.joinSession(dataFromServer.host.offer);
    }
  }

  hostUpdate = () => {
    const {dataFromServer, isAnswer} = this.state;
    if (dataFromServer?.client?.answer && !isAnswer) {
      this.setState({isAnswer: true});
      this.completeHandshake(dataFromServer.client.answer);
    }
  }

  componentDidUpdate() {
    const {role, dataFromServer} = this.state;
    console.log('UPDATESERVER', dataFromServer)
    if (role === ROLES.CLIENT) {
      this.clientUpdate();
    }
    if (role === ROLES.HOST) {
      this.hostUpdate();
    }
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
        video: {
          width: 1920,
          height: 1080,
          frameRate: 30,

        }
      }).then((stream) => {
        this.localStream = stream;
        callback(stream);
      }).catch(function (error) {
        console.log("getUserMedia error: ", error);
      });
  }

  joinSession = (data) => {
    console.log('joinSession');
    if (this.peerConnection == null) {
      this.getPeerConnection();
    }

    const sigdata = JSON.parse(data);
    if (sigdata["desc"] === "") {
      alert("Please enter the offer");
      return;
    }

    this.createAnswer(data);
  }

  createOffer = (stream) => {
    console.log('create offer');
    this.localVideo.current.srcObject = stream;
    this.localVideo.current.muted = true;
    this.peerConnection.addStream(stream);
    this.peerConnection.createOffer(this.onConnection, this.handleError);
  }

  initiateOffer = () => {
    console.log('initiateOffer')
    if (this.peerConnection == null) {
      this.getPeerConnection();
    }
    this.getMediaStream(this.createOffer);
  }

  onConnection = (desc) => {
    console.log("Description is ", desc);
    this.peerConnection.setLocalDescription(desc);
    this.signalData["desc"] = desc;
    //Change the event on click of Join Button to Complete Handshake on Initiator Side
    this.handleJoin = () => {
      this.completeHandshake();
    }
  }

  createAnswer = (data) => {
    console.log('create answer');
    const sigdata = JSON.parse(data);
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(sigdata["desc"]), function () { console.log("Success"); }, this.handleError);
    this.peerConnection.createAnswer(this.sendReply, this.handleError);
    this.addIceCandidates(sigdata["ice"]);
  }

  completeHandshake = (data) => {
    console.log("Inside complete handshake");
    let sigdata = data.trim();
    sigdata = JSON.parse(sigdata);
    if (!sigdata["desc"]) {
      alert("Please enter the answer");
      return;
    }
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(sigdata["desc"]), function () { console.log("Success"); }, this.handleError);
    this.addIceCandidates(sigdata["ice"]);
  }

  sendReply = (desc) => {
    const {roomInput} = this.state;
    console.log('send reply');
    this.peerConnection.setLocalDescription(desc);
    this.signalData["desc"] = desc;
    writeData(roomInput, ROLES.CLIENT, {
      answer: JSON.stringify(this.signalData),
    })
  }

  clearRoomThenStartSession = () => {
    const {roomInput, role} = this.state;

    clearData(roomInput, async () => {
      writeData(
        roomInput,
        role,
        {offer: JSON.stringify(this.signalData)},
        () => {
          this.setState({isHostReady: true});
          this.startCheckingServerData();
        });
    })
  }

  startCheckingServerData = () => {
    const {roomInput} = this.state;

    this.updateServerTimer = setInterval(async () => {
      const res = await readData(roomInput);
      this.setState({dataFromServer: res});
    }, 1000);
  }

  gotIceCandidate = (event) => {
    const {roomInput, role} = this.state;
    console.log('gotIceCandidate', event);
    if (event.candidate) {
      this.signalData["ice"].push(event.candidate);
      if (this.timeOut !== null) {
        clearTimeout(this.timeOut)
      }
      this.timeOut = setTimeout(() => {
        if (roomInput.length > 0) {
          if (role === ROLES.HOST) {
            this.clearRoomThenStartSession();
          }
          this.setState({input: JSON.stringify(this.signalData)})
        }
      }, 700);
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

  onConnectionStatusChange = (event) => {
    switch (this.peerConnection.iceConnectionState) {
      case 'checking':
        console.log('Connecting to peer...');
        break;
      case 'connected': // on caller side
        console.log('Connection established.');
        clearInterval(this.updateServerTimer);
        this.updateServerTimer = null;
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
    const {roomInput} = this.state;
    if (roomInput.length > 0) {
      this.initiateOffer();
    } else {
      alert('ENTER ROOM ID')
    }
  }

  handleJoin = () => {
    const {roomInput} = this.state;
    if (roomInput.length > 0) {
      this.startCheckingServerData();
    } else {
      alert('ENTER ROOM ID')
    }
  }

  setRole = (role) => {
    this.setState({role});
  }

  renderMain = () => {
    const {role, roomInput, isHostReady} = this.state;
    if (role !== '') {
      return (
        <>
          <input
            placeholder='ROOM ID'
            value={roomInput}
            onChange={(e) => this.setState({roomInput: e.target.value})}
          />
          {role === ROLES.HOST && (
            <div>
              <button onClick={this.handleCall} disabled={isHostReady}>
                {!isHostReady ? 'call' : "HOST READY"}
              </button>
              <div>
                <video
                  controls
                  autoPlay
                  ref={this.localVideo}
                  width={300}
                  height={300}
                />
              </div>
            </div>
          )}
          {role === ROLES.CLIENT && (
            <div>
              <button onClick={this.handleJoin}>
                join
              </button>
              <div>
                <video
                  controls
                  autoPlay
                  ref={this.remoteVideo}
                  width={300}
                  height={300}
                />
              </div>
            </div>
          )}
        </>
      )
    }
    return null;
  }

  render() {
    return (
      <div className="App">
        <button className="button" onClick={() => this.setRole(ROLES.HOST)}>
          Host
        </button>
        <button className="button" onClick={() => this.setRole(ROLES.CLIENT)}>
          Client
        </button>
        {this.renderMain()}
      </div>
    );
  }
}

export default App;
