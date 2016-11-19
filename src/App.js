'use strict'
const React = require('react')
const IPFS = require('ipfs')
const moment = require('moment')
require('purecss')
require('font-awesome-webpack')
require('./style.css')

const STATUS_INITIALIZING = 0
const STATUS_SETTING_ADDRESSES = 1
const STATUS_LOADING = 2
const STATUS_GOING_ONLINE = 3
const STATUS_READY = 4

const FETCH_COMPLETE = 'FETCH_COMPLETE'
const FETCH_ONGOING = 'FETCH_ONGOING'

const ERROR_REPO_EXISTS = 'Error: repo already exists'

const STATUS = [
  'Initializing',
  'Setting addresses',
  'Loading',
  'Going online',
  'Ready!'
]

class App extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      status: 'Null',
      addresses: '{}',
      peerid: 'None',
      node: null,
      peers: [],
      data_to_save: null,
      saved_data_hash: null,
      loaded_data: null,
      hash_to_fetch: null,
      fetch_status: FETCH_COMPLETE,
      fetch_timing: null,
      fetch_start: null,
      fetch_end: null
    }
    this.saveData = this.saveData.bind(this)
    this.dataToSaveChange = this.dataToSaveChange.bind(this)
    this.hashToFetchChange = this.hashToFetchChange.bind(this)
    this.fetchData = this.fetchData.bind(this)
  }
  setStatus (newStatus) {
    this.setState({
      status_phase: newStatus,
      status: STATUS[newStatus]
    })
  }
  componentDidMount () {
    const repoPath = '' + Math.random()
    const node = new IPFS(repoPath)
    this.setState({node})

    this.setStatus(STATUS_INITIALIZING)
    node.init({ emptyRepo: true, bits: 2048 }, (err) => {
      if (err && err.toString() !== ERROR_REPO_EXISTS) {
        throw err
      }

      node.config.get((err, config) => {
        if (err) throw err
        this.setStatus(STATUS_SETTING_ADDRESSES)
        const signalServer = ('/libp2p-webrtc-star/ip4/178.62.241.75/tcp/9090/ws/ipfs/' + config.Identity.PeerID)
        let Addresses = {
          API: '/ip4/127.0.0.1/tcp/5001',
          Swarm: ['/ip4/0.0.0.0/tcp/4001', signalServer],
          Gateway: '/ip4/0.0.0.0/tcp/8080'
        }
        this.setState({addresses: Addresses, peerid: config.Identity.PeerID})
        node.config.set('Addresses', Addresses, (err) => {
          if (err) throw err
          this.setStatus(STATUS_LOADING)
          node.load((err) => {
            if (err) throw err
            this.setStatus(STATUS_GOING_ONLINE)
            node.goOnline((err) => {
              if (err) throw err
              this.setStatus(STATUS_READY)
              setInterval(() => {
                node.swarm.peers((err, peers) => {
                  if (err) throw err
                  this.setState({peers})
                })
              }, 2000)
            })
          })
        })
      })
    })
  }
  dataToSaveChange (e) {
    const value = e.target.value.trim()
    this.setState({data_to_save: value})
  }
  saveData (e) {
    e.preventDefault()
    this.state.node.files.add([new Buffer(this.state.data_to_save)], (err, res) => {
      if (err) {
        throw err
      }
      const hash = res[0].hash
      this.setState({saved_data_hash: hash})
    })
  }
  hashToFetchChange (e) {
    const value = e.target.value.trim()
    this.setState({hash_to_fetch: value})
  }
  fetchData (e) {
    e.preventDefault()
    this.setState({
      fetch_status: FETCH_ONGOING,
      fetch_start: window.performance.now(),
      returned_data: null,
      fetch_timing: null
    })
    this.state.node.files.cat(this.state.hash_to_fetch, (err, res) => {
      if (err) {
        throw err
      }
      let data = ''
      res.on('data', (d) => {
        data = data + d
        console.log('got', data)
        this.setState({returned_data: data})
      })
      res.on('end', () => {
        const timing = Math.floor(window.performance.now() - this.state.fetch_start)
        this.setState({fetch_status: FETCH_COMPLETE, returned_data: data, fetch_timing: timing})
      })
    })
  }
  renderSavedHash (savedHash) {
    if (savedHash) {
      return <small>
        <i className='fa fa-hashtag' />
        &nbsp;
        {savedHash}
      </small>
    } else {
      return null
    }
  }
  renderPeers (peers) {
    if (peers.length > 0) {
      return peers.map((ma) => {
        return <div><pre>{ma.toString()}</pre></div>
      })
    } else {
      return <div>No peers found so far</div>
    }
  }
  renderReturnedData (returnedData) {
    if (returnedData) {
      return <div>
        <i className='fa fa-envelope-open' />
        &nbsp;
        {returnedData}
      </div>
    } else {
      return null
    }
  }
  renderLoadButton (fetchStatus) {
    if (fetchStatus === FETCH_COMPLETE) {
      return <button className='pure-button pure-button-primary'>
        <i className='fa fa-download' />
        &nbsp;
        Load
      </button>
    } else {
      return <button className='pure-button pure-button-primary pure-button-disabled'>
        <i className='fa fa-refresh fa-spin' />
        &nbsp;
        Load
      </button>
    }
  }
  renderFetchTiming (currentTime) {
    if (currentTime) {
      let unit = 'milliseconds'
      if (currentTime > 1000) {
        currentTime = moment.duration(currentTime).asSeconds()
        unit = 'seconds'
      }
      return <div>
        <i className='fa fa-tachometer' />
        <span>
          &nbsp;<small>Time to load: {currentTime} {unit}</small>
        </span>
      </div>
    } else {
      return null
    }
  }
  render () {
    return <div className='pure-g'>
      <div className='pure-u-1-3'>
        <h1>Save Data</h1>
        <form className='pure-form' action='#' onSubmit={this.saveData}>
          <fieldset>
            <input type='text' onChange={this.dataToSaveChange} />
            &nbsp;
            <input type='submit' value='Save' hidden />
            <button className='pure-button pure-button-primary'>
              <i className='fa fa-save' />
              &nbsp;
              Save
            </button>
          </fieldset>
        </form>
        {this.renderSavedHash(this.state.saved_data_hash)}
      </div>
      <div className='pure-u-1-3'>
        <h1>Load Data</h1>
        <form className='pure-form' action='#' onSubmit={this.fetchData}>
          <fieldset>
            <input type='text' onChange={this.hashToFetchChange} />
            &nbsp;
            <input type='submit' value='Load' hidden />
            {this.renderLoadButton(this.state.fetch_status)}
          </fieldset>
        </form>
        <div>
          {this.renderReturnedData(this.state.returned_data)}
        </div>
        <div>{this.renderFetchTiming(this.state.fetch_timing)}</div>
      </div>
      <div className='pure-u-1-3'>
        <h1>Usage</h1>
        <p>This is a demo of how to pass data between browsers with js-ipfs</p>
        <p>
          If it get stuck at "Going online", Chrome is blocking the insecure
          connection to the signaling server. Click on the little shield on the
          right in the URL bar to allow it to connect.
        </p>
        <p>In Firefox you need to set the <code>network.websocket.allowInsecureFromHTTPS</code> property to true for it to work.</p>
        <h1>IPFS Status</h1>
        <div>
          <h3>Status</h3>
          <i className={'fa fa-battery-' + this.state.status_phase} />
          &nbsp;
          {this.state.status}
        </div>
        <div>
          <h3>PeerID</h3>
          {this.state.peerid}
        </div>
        <div>
          <h3>Swarm Addresses</h3>
          <pre>{JSON.stringify(this.state.addresses.Swarm, null, 2)}</pre>
        </div>
        <h1>Connected Peers ({this.state.peers.length})</h1>
        <div>
          {this.renderPeers(this.state.peers)}
        </div>
      </div>
    </div>
  }
}
module.exports = App
