# QuantGuide Question

## 209. Coloring Components III

**Metadata**

- ID: `xJZ0gXFboBsYdMrQaMtT`
- URL: https://www.quantguide.io/questions/coloring-components-iii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: i made it up
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 6
- Last Edited: 2023-9-9 12:32:48 America/New_York
- Last Edited By: Gabe

### 题干

Consider a line of $20$ adjacent colorless squares. Color in each individual square black or white with equal probability, independent of all other squares. A connected $5$-component is a group of $5$ consecutive black squares. Note that overlapping components are not counted. For example, WBBBBBWWB and WBBBBBBWB have $1$ connected $5$-component, but WBBBBBBBBBBW has $2$ connected $5$-components. Find the expected number of connected $5$-components in our line. The answer can be written as a simplified fraction of the form $\dfrac{p}{q}$. Find $p + q$.

### Hint

Try computing the expected number of connected $5$-components if we counted overlaps. Then consider subtracting out the subsequent term.

### 解答

If we were to count overlaps, we could simply set up an indicator variable over every window of $5$ squares and applying Linearity of Expectation. This is simply $16$ windows of probability $1/32$ each, for an expected value of $1/2$. 

$$$$

To account for overlaps, let's analyze how many times we want to count consecutive chains of black squares of certain lengths. For example, if we have exactly $6$ black squares in a row, we want to count this as $1$ connected $5$-component, but if there are exactly $10$ black squares in a row, we want to count this as $2$. In general, for exactly $n$ black squares in a row, we want to count this as $\lfloor n/5 \rfloor$ connected $5$-components. This can be achieved by repeating our scheme for counting overlaps for multiples of $5$ but subtracting the expected number of results we would get from considering overlapping chains of length $1$ greater. Denoting $C_n$ as the expected number of chains of $n$ consecutive black squares while counting overlaps, our answer is $$C_5 - C_6 + C_{10} - C_{11} + C_{15} - C_{16} + C_{20}$$ 
$$= \left( 16 \cdot \dfrac{1}{2^5}\right) - \left( 15 \cdot \dfrac{1}{2^6}\right) + \left( 11 \cdot \dfrac{1}{2^{10}}\right) - \left( 10 \cdot \dfrac{1}{2^{11}}\right) + \left( 6 \cdot \dfrac{1}{2^{15}}\right) - \left( 5 \cdot \dfrac{1}{2^{16}}\right) + \left( 1 \cdot \dfrac{1}{2^{20}}\right) = \dfrac{284785}{1048576}.$$

We get the term $C_k = \dfrac{21-k}{2^k}$ from the fact that there are $21-k$ spots for a length $k$ chain to start at and the probability of it starting at any given spot is $\dfrac{1}{2^k}$. Our answer is $284785 + 1048576 = 1333361$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1333361"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "xJZ0gXFboBsYdMrQaMtT",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "lastEditedAt": "2023-9-9 12:32:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1620045,
    "source": "i made it up",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coloring Components III",
    "topic": "probability",
    "urlEnding": "coloring-components-iii",
    "version": 6
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "xJZ0gXFboBsYdMrQaMtT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Coloring Components III",
    "topic": "probability",
    "urlEnding": "coloring-components-iii"
  }
}
```
