/**
 * Outputs valueCurrency object as string
 *
 * @param valueCurrency {Object} - directly from Azure AI API
 * @return {String}
 */
function formatCurrency (valueCurrency) {
  if (!valueCurrency) return ''
  return `${valueCurrency.currencySymbol ?? ''} ${valueCurrency.valueAmount ?? ''}`.trim()
}

function formatAddress (valueAddress) {
  return `${valueAddress.road} ${valueAddress.houseNumber}, ${valueAddress.postalCode} ${valueAddress.city}`
}

/**
 * Sorts long "fields" array from Azure.
 *
 * @param fieldsArray {Array} - directly from Azure AI azureReceiptUtils
 * @return {Object}
 */
function sortFields (fieldsArray) {
  const merchantInfo = {}
  const receiptInfo = {}
  let items = [] // TODO

  for (const f of fieldsArray) {
    switch (f.field) {
      case 'CountryRegion':
        receiptInfo.countryRegion = {
          value: f.valueCountryRegion,
          confidence: f.confidence,
        }
        break
      case 'Items':
        // console.log('got items---->', f.valueArray)
        items = f.valueArray // TODO
        break
      case 'MerchantAddress':
        merchantInfo.address = {
          // content: f.content,
          value: f.valueAddress,
          formattedValue: formatAddress(f.valueAddress),
          confidence: f.confidence,
        }
        break
      case 'MerchantName':
        merchantInfo.name = {
          value: f.content,
          confidence: f.confidence,
        }
        break
      case 'MerchantPhoneNumber':
        merchantInfo.phone = {
          value: f.valuePhoneNumber,
          confidence: f.confidence,
        }
        break
      case 'ReceiptType':
        receiptInfo.type = {
          value: f.valueString,
          confidence: f.confidence,
        }
        break
      case 'TaxDetails':
        receiptInfo.taxDetails = {
          value: f.valueArray, // TODO in subfunction
          confidence: f.confidence,
        }
        break
      case 'Total':
        receiptInfo.total = {
          value: f.valueCurrency, // TODO in subfunction
          formattedValue: formatCurrency(f.valueCurrency),
          confidence: f.confidence,
        }
        break
      case 'TotalTax':
        receiptInfo.totalTax = {
          value: f.valueCurrency, // TODO in subfunction
          formattedValue: formatCurrency(f.valueCurrency),
          confidence: f.confidence,
        }
        break
      case 'TransactionDate':
        receiptInfo.transactionDate = {
          value: f.valueDate,
          confidence: f.confidence,
        }
        break
      case 'TransactionTime':
        receiptInfo.transactionTime = {
          value: f.valueTime,
          confidence: f.confidence,
        }
        break
    }
  }

  return {
    merchant: merchantInfo,
    receipt: receiptInfo,
    items: items,
  }
}

function sortItems (itemsArry) {
  // console.log('👋 sortItems()')
  if (!itemsArry) {
    return {
      items: [],
    }
  }

  let subtotal = 0
  let hasQuantity = false
  let result = []

  itemsArry.forEach((item) => {
    // console.log(item)
    const itemData = {
      confidence: item.valueObject.confidence,
    }

    if (item.valueObject.Quantity) {
      hasQuantity = true
      itemData.quantity = {
        value: item.valueObject.Quantity.valueNumber,
        confidence: item.valueObject.Quantity.confidence,
      }
    }

    if (item.valueObject.Description) {
      itemData.description = {
        value: item.valueObject.Description.valueString,
        confidence: item.valueObject.Description.confidence,
      }
    }

    if (item.valueObject.TotalPrice) {
      itemData.totalPrice = {
        value: item.valueObject.TotalPrice.valueCurrency.amount,
        confidence: item.valueObject.TotalPrice.confidence,
      }
      subtotal += item.valueObject.TotalPrice.valueCurrency.amount
    }

    result.push(itemData)
  })

  // Round subtotal to 2 decimal places for currency
  subtotal = Math.round(subtotal * 100) / 100

  return {
    hasQuantity,
    subtotal,
    items: result,
  }
}

export const AZReceiptModelUtils = {
  sortFields,
  sortItems,
  formatCurrency,
}
