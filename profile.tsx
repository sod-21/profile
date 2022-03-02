import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfileEdit from '../components/Profile/ProfileEdit';
import Backdrop from '../components/Utilities/Backdrop';
import ItemCard from '../components/Utilities/ItemCard';
import Share from '../components/Utilities/Share';
import { DefaultAvatar, GRAPHQL_URL } from '../config/constants';
import { useActiveWeb3React } from '../hooks';
import { useCoverBg } from '../hooks/useCoverBg';
import useFollowButton from '../hooks/useFollowButton';
import { getSaturnaNFTAddress } from '../utils/addressHelpers';
import { nFormatter } from '../utils/helper';
import multicall from '../utils/multicall';
import NFTABI from '../config/abi/saturnaNFT.json';

const Profile = () => {

    let { username }: any = useParams();
    const {account, library} = useActiveWeb3React()
    const [user, setUser] = useState(null)
    const [items, setItems] = useState({
        created: [],
        liked: [],
        currentBid: [],
        owned: []
    })
    const bg = useCoverBg(user?.image || DefaultAvatar)

    const [active, setActive] = useState('created');
    const [ownProfile, setownProfile] = useState(false);
    const [showProfileEditForm, setShowProfileEditForm] = useState(false);
    const [showShare, setShowShare] = useState(false);

    const { didFollow, follow } = useFollowButton(user)

    useEffect(() => {
        if(username) {
            fetchUser()
        }
    }, [username])

    const fetchUser = async() => {
        axios.get(`user`, {
            params: {
                username: username,
            }
        }).then((response) => {
            setUser(response.data.user);
        });
    }

    const fetchItem = async(address, category) => {
        let itemIds = []
        if(!address) return;
        if(category === 'currentBid') {
            const response = await axios.post(
                GRAPHQL_URL,
                {
                  query: `{
                    bids(where: {bidder: "${address}", isActive: true}) {
                        itemId {
                            id
                        }
                        bidder
                        isActive
                    }
                  }`
                }
              )
            const bids = response?.data?.data?.bids
            itemIds = bids.map(bid => bid.itemId.id)
        } else if(category == 'owned') {
            const response = await axios.post(
                GRAPHQL_URL,
                {
                  query: `{
                    owners(where: {id: "${address.toLowerCase()}"}) {
                        id
                        ownedTokens {
                            id
                            contract {
                                id
                            }
                        }
                    }
                  }`
                }
              )
            const ownedTokens= response?.data?.data?.owners?.[0]?.ownedTokens
            itemIds = (ownedTokens || []).filter(item => item?.contract?.id?.toLowerCase() == getSaturnaNFTAddress()?.toLowerCase())
            itemIds = itemIds.map(item => parseInt(item.id))
            
            const calls = itemIds.map(id => ({
                address: getSaturnaNFTAddress(),
                name: 'tokenURI',
                params: [id],
            }))
            
            const tokenURIs = await multicall(NFTABI, calls)
            let promises = tokenURIs.map(item => axios.get(item[0]))
            let tempItems = []
            await axios.all(promises).then(axios.spread((...responses: any) => {
                for(let i = 0 ; i < responses.length; i++) {
                    tempItems.push({
                        name: responses[i]?.data?.name,
                        description: responses[i]?.data?.description,
                        creator: responses[i]?.data?.creator,
                        type: responses[i]?.data?.type,
                        image: responses[i]?.data?.image,
                    })
                }
                items['owned'] = tempItems
                setItems(items)
            })).catch(errors => {
                console.log(errors)
            })
            return;
        }
        axios.get(`user/items`, {
            params: {
                address: address,
                category: category,
                ids: JSON.stringify(itemIds)
            }
        }).then((response) => {
            let temp = items
            temp[category] = (response.data.items || []).filter(item => !item.isSold)
            setItems(temp)
        });
    }
    
    useEffect(() => {
        if (account && account?.toLowerCase() === user?.address) {
            setownProfile(true);
        }
        if(user) {
            fetchItem(user.address, 'liked');
            fetchItem(user.address, 'created');
            fetchItem(user.address, 'currentBid');
            fetchItem(user.address, 'owned');
        }
    }, [user, account]);

    return (
        <>
            {user ? <div >
                <div className="flex flex-col items-center mt-20">
                    <div className="rounded-full w-24 h-24" style={bg}></div>
                    <p className="font-bold text-2xl mt-6">{user.fullname}</p>
                    <p className="text-gray-500 mt-3">@{user.username}</p>
                    <p className="mt-3 max-w-lg">{user.description}</p>
                    <div className="flex mt-3 space-x-8">
                        <div className="flex flex-col">
                            <p className="font-bold">{user.follower}</p>
                            <p className="text-gray-500">Followers</p>
                        </div>
                        <div className="flex flex-col">
                            <p className="font-bold">{user.following}</p>
                            <p className="text-gray-500">Following</p>
                        </div>
                        <div className="flex flex-col">
                            <p className="font-bold">{user.likes}</p>
                            <p className="text-gray-500">Likes</p>
                        </div>
                        <div className="flex flex-col">
                            <p className="font-bold">${nFormatter(user.worth || 0, 2)}</p>
                            <p className="text-gray-500">Worth</p>
                        </div>
                    </div>
                    <div className="flex mt-5">
                        {!ownProfile && <>
                            <button className="border border-gray-200 px-8 py-2 rounded-3xl font-bold mr-4" onClick={() => follow()}>
                                {didFollow ? 'Following' : 'Follow'}
                            </button>
                            <button className="border border-gray-200 px-8 py-2 rounded-3xl font-bold" onClick={() => setShowShare(true)}>Share</button>
                        </>}
                        {ownProfile && <>
                            <button onClick={() => setShowProfileEditForm(true)} className="border border-gray-200 px-8 py-2 rounded-3xl font-bold mr-4">Edit profile</button>
                        </>}
                    </div>
                </div>
                <div className="mt-16 lg:mx-56 px-4 lg:px-0">
                    <div className="flex justify-start space-x-8 ">
                        <button onClick={() => setActive('created')} className={"text-gray-500 hover:text-gray-800 font-bold " + (active === 'created' ? 'text-gray-800' : '')}>Created</button>
                        <button onClick={() => setActive('liked')} className={"text-gray-500 hover:text-gray-800 font-bold " + (active === 'liked' ? 'text-gray-800' : '')}>Liked</button>
                        {
                            ownProfile &&
                            <button onClick={() => setActive('currentBids')} className={"text-gray-500 hover:text-gray-800 font-bold " + (active === 'currentBids' ? 'text-gray-800' : '')}>Current Bids</button>
                        }
                        {
                            <button onClick={() => setActive('owned')} className={"text-gray-500 hover:text-gray-800 font-bold " + (active === 'owned' ? 'text-gray-800' : '')}>Owned</button>
                        }
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 mt-8">
                        {active === 'created' &&
                            <>
                                {
                                    items['created'].map(item => {
                                        return <div key={item.id} className="col-span-1 mb-10 lg:mr-12">
                                            <ItemCard nft={item} />
                                        </div>

                                    })}
                            </>
                        }

                        {active === 'liked' &&
                            <>
                                {
                                    items['liked'].map(item => {
                                        return <div key={item.id} className="col-span-1 mb-10 lg:mr-12">
                                            <ItemCard nft={item} />
                                        </div>

                                    })}
                            </>
                        }


                        {active === 'currentBids' &&
                            <>
                                {
                                    items['currentBid'].map(item => {
                                        return <div key={item.id} className="col-span-1 mb-10 lg:mr-12">
                                            <ItemCard nft={item} />
                                        </div>

                                    })}
                            </>
                        }

                        {active === 'owned' &&
                            <>
                                {
                                    items['owned'].map(item => {
                                        return <div key={item.id} className="col-span-1 mb-10 lg:mr-12">
                                            <ItemCard nft={item} token={true}/>
                                        </div>

                                    })}
                            </>
                        }
                    </div>
                </div>
                {showProfileEditForm && <Backdrop>
                    <ProfileEdit onCancel={() => setShowProfileEditForm(false)} user={user} />
                </Backdrop>}
                {showShare && <Backdrop>
                    <Share onCancel={() => setShowShare(false)} />
                </Backdrop>}
            </div> : null }
        </>    
    )
}


export default Profile
