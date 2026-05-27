# QuantGuide Question

## 61. Put-Call Parity I

**Metadata**

- ID: `nMED45PB23taahJzPsLl`
- URL: https://www.quantguide.io/questions/putcall-parity-i
- Topic: finance
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Finance
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-8-28 14:35:08 America/New_York
- Last Edited By: Gabe

### 题干

You are a trader trying to find an arbitrage opportunity. Your friend tells you to look at the $\$100$ strike on the $\$TSLA$ April options chain, as he thinks there may be a mispricing. Currently, $\$TSLA$ is trading at $\$110$, and the put sells for $\$2$. Your friend tells you if the call is priced at anything under $\$14$ then the market is mispricing the option and you should buy as many calls as possible. Is your friend right?
$\\~\\$
If so, input $14$. If not, input the whole number the call would need to be priced under to present an arbitrage opportunity.
$\\~\\$
(TSLA does not pay a dividend)

### Hint

How does the difference in strike price and spot price affect the difference between our call and put price?
$\\~\\$
When the strike and spot price are the same are the call and put price the same?

### 解答

The put-call parity formula is given by:
\[
C=S-E e^{-r t}+P
\]
Where 

\[
\text{C = Call Price}\\
\text{P = Put Price}\\
\text{S = Stock Price}\\
\text{E = Exercise/Strike Price}\\
\text{r = Continuously compounded interest rate }\\
\text{T = Time to expiration}\]
$\\~\\$
As $\$TSLA$ does not pay a dividend, we can ignore $e^{-r t}$ section of our equation, as it will equate to 1. When plugging in the values we have, we see that \(C=\$ 110-\$ 100+P\). Therefore, if the put is priced at $\$2$ dollars, and efficient market would price the call at $\$12$.
$\\~\\$
This means that any call option priced under $\$12$ would present an arbitrage opportunity, making our answer $12$.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "nMED45PB23taahJzPsLl",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 14:35:08 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 435809,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put-Call Parity I",
    "topic": "finance",
    "urlEnding": "putcall-parity-i",
    "version": 4
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "nMED45PB23taahJzPsLl",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Finance"
      }
    ],
    "title": "Put-Call Parity I",
    "topic": "finance",
    "urlEnding": "putcall-parity-i"
  }
}
```
