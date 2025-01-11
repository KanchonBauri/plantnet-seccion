import PropTypes from 'prop-types'
import { useState } from 'react'
import DeleteModal from '../../Modal/DeleteModal'
import { axiosSecure } from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
const CustomerOrderDataRow = ({ orderData, refetch }) => {
  let [isOpen, setIsOpen] = useState(false)
  const closeModal = () => setIsOpen(false)
  // eslint-disable-next-line no-unused-vars
  const { name, image, category, price, quantity, _id, status, plantId, contact, address } = orderData

  // handle order delete/cancellation
  const handleDelete = async () => {
    try {
      await axiosSecure.delete(`/orders/${_id}`)
      // increase quantity from plant collection
      await axiosSecure.patch(`/plants/quantity/${plantId}`, {
        quantityToUpdate: quantity,
        status: 'increase',
      })
      // fetch delete request 
      console.log(_id)
      // call refatch to refresh ui(fetch orders data again)
      refetch()
      toast.success('Order Cancelled')
    } catch (err) {
      console.log(err)
      toast.error(err.response.data)
    } finally {
      closeModal()
    }
  }

  return (
    <tr>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <div className='flex items-center'>
          <div className='flex-shrink-0'>
            <div className='block relative'>
              <img
                alt='profile'
                src={image}
                className='mx-auto object-cover rounded h-10 w-15 '
              />
            </div>
          </div>
        </div>
      </td>

      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{name}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{category}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>${price}</p>
      </td>
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{quantity}</p>
      </td>
      {/* <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{address}</p>
        <p className='text-gray-900 whitespace-no-wrap'>{contact}</p>
      </td> */}
      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <p className='text-gray-900 whitespace-no-wrap'>{status}</p>
      </td>

      <td className='px-5 py-5 border-b border-gray-200 bg-white text-sm'>
        <button
          onClick={() => setIsOpen(true)}
          className='relative disabled:cursor-not-allowed cursor-pointer inline-block px-3 py-1 font-semibold text-lime-900 leading-tight'
        >
          <span className='absolute cursor-pointer inset-0 bg-red-200 opacity-50 rounded-full'></span>
          <span className='relative cursor-pointer'>Cancel</span>
        </button>

        <DeleteModal handleDelete={handleDelete} isOpen={isOpen} closeModal={closeModal} />
      </td>
    </tr>
  )
}

CustomerOrderDataRow.propTypes = {
  orderData: PropTypes.shape({
    name: PropTypes.string,
    image: PropTypes.string,
    category: PropTypes.string,
    price: PropTypes.number,
    quantity: PropTypes.number,
    _id: PropTypes.string,
    status: PropTypes.string,
    contact: PropTypes.string,
    address: PropTypes.string,
    plantId: PropTypes.string,
  }).isRequired,
  refetch: PropTypes.func,
}

export default CustomerOrderDataRow
