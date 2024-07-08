mod api_dev;
mod config;
mod primitives;
mod sdk;
mod transactions;
mod utils;

use api_dev::api as avail;
use config::AccountId;

pub use api_dev::api::data_availability::calls::types::create_application_key::Key;
pub use api_dev::api::data_availability::calls::types::submit_data::Data;
pub use api_dev::api::runtime_types::frame_support::dispatch::DispatchFeeModifier;
pub use api_dev::api::runtime_types::pallet_staking::ValidatorPrefs;
pub use sdk::{WaitFor, SDK};
pub use subxt::config::polkadot::H256;
pub use subxt_signer::{sr25519::Keypair, SecretUri};

pub type RewardDestination =
	api_dev::api::runtime_types::pallet_staking::RewardDestination<AccountId>;
