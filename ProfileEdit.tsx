import axios from 'axios';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { getUser, loginUser, useAuthDispatch, useAuthState } from '../../contexts/AuthContext';
import { useActiveWeb3React } from '../../hooks';
import { UserModel } from '../../types/types';
import { isSameAddress } from '../../utils/helper';
import ipfs from '../../utils/ipfsApi';
import FileUploader from '../Utilities/FileUploader';
import qs from 'qs'
import { useHistory } from 'react-router-dom';

const ProfileEdit = ({ user, onCancel }: ProfilePropsModel) => {

    const [image, setImage] = useState<any>(user.image ? user.image : null);
    const [imageBuf, setImageBuf] = useState(null);
    const [fullname, setFullName] = useState(user.fullname);
    const [username, setUsername] = useState(user.username);
    const [description, setDescription] = useState(user.description);

    const [isProcessing, setIsProcessing] = useState(false);
    const {account, library} = useActiveWeb3React();
    const { token } = useAuthState()
    const dispath = useAuthDispatch()
    const history = useHistory()

    const onFileUpload = (e: any) => {
        setImage(URL.createObjectURL(e.target.files[0]));
        var reader = new FileReader();
        reader.onload = function () {
            setImageBuf(reader.result);
        };
        reader.readAsArrayBuffer(e.target.files[0]);
    }

    const handleUpdate = async() => {
        if(!isSameAddress(user?.address, account)) {
            toast.error('Invalid User. you can edit only yours')
            return
        }
        setIsProcessing(true);
        
        if(!token) {
            await loginUser(dispath, account, user.nonce, library)
        }

        let imageUrl = image;
        if (imageBuf) {
            const result = await ipfs.files.add(Buffer.from(imageBuf));
            imageUrl = `https://ipfs.io/ipfs/${result[0].hash}`;
        }

        await axios.post(`user/update`, qs.stringify({
            address: account,
            username: username,
            fullname: fullname,
            description: description,
            image: imageUrl
        }))

        await getUser(dispath, account)
        setIsProcessing(false);
        toast.success('User Profile has been updated');
        history.go(0)
    }

    return (
        <div className="relative p-12 bg-white rounded-3xl flex flex-col items-start w-full mx-4 lg:mx-0 max-w-lg max-h-90vh overflow-y-auto">
            <button onClick={() => onCancel()} className="absolute top-5 right-5">
                <img src="/close.svg" alt="close" width="24px" height="24px" />
            </button>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <form className="mt-8 flex flex-col w-full">
                <label htmlFor="imageUpload" className="text-left font-bold">Profile Picture</label>
                <div className="p-3 border-dashed border-2  rounded-3xl border-light-blue-500 mt-2">
                    <div className="w-28 h-28 rounded-full mx-auto" style={{ background: `center / cover no-repeat url(${image})` }}></div>
                    {image === null && <p>JPG, PNG (Max 5MB)</p>}
                    <FileUploader onUpload={(e: Event) => { onFileUpload(e) }} />
                </div>


                <div className="flex justify-between mt-6">
                    <label htmlFor="name" className="text-left font-bold">Profile name</label>
                    <span className="text-gray-500">10</span>
                </div>
                <input onChange={(e) => {setFullName(e.target.value)}} maxLength={10} className="bg-br-gray rounded-3xl px-4 py-3 mt-2" type="text" id="name" name="name" defaultValue={fullname} />



                <div className="flex justify-between mt-6">
                    <label htmlFor="username" className="text-left font-bold">User name</label>
                    <span className="text-gray-500">20</span>
                </div>
                <input onChange={(e) => {setUsername(e.target.value)}} maxLength={20} className="bg-br-gray rounded-3xl px-4 py-3 mt-2" type="text" id="username" name="username" defaultValue={username} />



                <div className="flex justify-between mt-6">
                    <label htmlFor="description" className="text-left font-bold">Description</label>
                    <span className="text-gray-500">250</span>
                </div>
                <textarea rows={4} onChange={(e) => {setDescription(e.target.value)}} maxLength={250} className="bg-br-gray rounded-3xl px-4 py-3 mt-2" id="description" name="description" defaultValue={description} />
            </form>
            <div className="flex justify-end mt-8 w-full">
                <button className="border border-gray-200 px-5 py-3 mr-3 rounded-3xl font-bold" onClick={() => {onCancel()}}>Cancel</button>
                <button className="border bg-br-primary px-5 py-3 rounded-3xl font-bold" onClick={() => {handleUpdate()}}>Save</button>
            </div>
        </div>
    )
}

interface ProfilePropsModel {
    user: UserModel;
    onCancel: Function;
}

export default ProfileEdit
