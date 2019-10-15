$(function () {

    let localStream = null;
    let peer = null;
    let existingCall = null;
    let remoteStream = null;
    let recorder = null;
    let audioSelect = $('#audioSource');
    let videoSelect = $('#videoSource');

    navigator.mediaDevices.enumerateDevices()
        .then(function (deviceInfos) {
            for (let i = 0; i !== deviceInfos.length; ++i) {
                let deviceInfo = deviceInfos[i];
                let option = $('<option>');
                option.val(deviceInfo.deviceId);
                if (deviceInfo.kind === 'audioinput') {
                    option.text(deviceInfo.label);
                    audioSelect.append(option);
                } else if (deviceInfo.kind === 'videoinput') {
                    option.text(deviceInfo.label);
                    videoSelect.append(option);
                }
            }
            videoSelect.on('change', setupGetUserMedia);
            audioSelect.on('change', setupGetUserMedia);
            setupGetUserMedia();
        }).catch(function (error) {
            console.error('mediaDevices.enumerateDevices() error:', error);
            return;
        });

    peer = new Peer({
        key: 'f9613972-35ff-4555-a212-ef68d10cdf71',
        debug: 3
    });

    peer.on('open', function () {
        $('#my-id').text(peer.id);
    });

    peer.on('error', function (err) {
        alert(err.message);
    });

    $('#make-call').submit(function (e) {
        e.preventDefault();
        let roomName = $('#join-room').val();
        if (!roomName) {
            return;
        }
        const call = peer.joinRoom(roomName, {
            mode: 'sfu',
            stream: localStream
        });
        setupCallEventHandlers(call);
    });

    $('#end-call').click(function () {
        existingCall.close();
    });

    $('#recording button').click(function () {
        if (recorder) {
            console.log("button recorder");
            recorder.stop();
            $('#recording button').text('Recording');
            $('#downloadlink').hide();
        } else {
            let recordStream;
            if (remoteStream) {
                console.log("button remoteStream");
                console.log(remoteStream);
                recordStream = remoteStream;
            } else if (localStream) {
                console.log("button localStream");
                console.log(localStream);
                recordStream = localStream;
            } else {
                return;
            }

            let chunks = [];
            let options = {
                mimeType: 'video/webm; codecs=vp9'
            };

            recorder = new MediaRecorder(recordStream, options);

            recorder.ondataavailable = function (evt) {
                console.log("data available: evt.data.type=" + evt.data.type + " size=" + evt.data.size);
                chunks.push(evt.data);
            };

            recorder.onstop = function (evt) {
                console.log('recorder.onstop(), so playback');
                recorder = null;
                const videoBlob = new Blob(chunks, {
                    type: "video/webm"
                });
                blobUrl = window.URL.createObjectURL(videoBlob);
                $('#downloadlink').attr("download", 'recorded.webm');
                $('#downloadlink').attr("href", blobUrl);
                $('#downloadlink').show();
            };
            recorder.start(1000);
            console.log('start recording');
            $('#recording button').text('Stop');
            $('#downloadlink').hide();
        }

        console.log("button");
    });

    function setupGetUserMedia() {
        let constraints = {
            video: {
                width: screen.width,
                height: screen.height,
                // displaySurface: 'monitor', // monitor or window or application or browser
                // logicalSurface: true,
                frameRate: 30,
                // aspectRatio: 1.77,
                cursor: 'never', // always or never or motion
            }
        };

        if (localStream) {
            localStream = null;
        }

        navigator.mediaDevices.getDisplayMedia(constraints)
            .then(function (stream) {
                $('#myStream').get(0).srcObject = stream;
                localStream = stream;

                if (existingCall) {
                    existingCall.replaceStream(stream);
                }

            }).catch(function (error) {
                console.error('mediaDevice.getUserMedia() error:', error);
                return;
            });
    }

    function setupCallEventHandlers(call) {
        if (existingCall) {
            existingCall.close();
        };

        existingCall = call;
        setupEndCallUI();
        $('#room-id').text(call.name);

        call.on('stream', function (stream) {
            addVideo(stream);
            remoteStream = stream;
        });

        call.on('removeStream', function (stream) {
            removeVideo(stream.peerId);
        });

        call.on('peerLeave', function (peerId) {
            removeVideo(peerId);
        });

        call.on('close', function () {
            removeAllRemoteVideos();
            setupMakeCallUI();
        });

    }

    function addVideo(stream) {
        const videoDom = $('<video autoplay>');
        videoDom.attr('id', stream.peerId);
        videoDom.get(0).srcObject = stream;
        $('.videosContainer').append(videoDom);
    }

    function removeVideo(peerId) {
        $('#' + peerId).remove();
    }

    function removeAllRemoteVideos() {
        $('.videosContainer').empty();
    }

    function setupMakeCallUI() {
        $('#make-call').show();
        $('#end-call').hide();
        $('#recording').hide();
    }

    function setupEndCallUI() {
        $('#make-call').hide();
        $('#end-call').show();
        $('#recording').show();
    }

});