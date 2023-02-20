module avail-gsrpc-examples

go 1.16

require (
	github.com/centrifuge/go-substrate-rpc-client v2.0.0+incompatible
	github.com/centrifuge/go-substrate-rpc-client/v4 v4.0.12
	github.com/ethereum/go-ethereum v1.11.1 // indirect
	github.com/rs/cors v1.8.3 // indirect
	github.com/tyler-smith/go-bip39 v1.1.0
	github.com/vedhavyas/go-subkey v1.0.4 // indirect
	go.uber.org/ratelimit v0.2.0
	golang.org/x/crypto v0.6.0 // indirect
)

replace github.com/centrifuge/go-substrate-rpc-client/v4 => github.com/maticnetwork/go-substrate-rpc-client/v4 v4.0.12-avail-1.4.0-rc1-5e286e3
