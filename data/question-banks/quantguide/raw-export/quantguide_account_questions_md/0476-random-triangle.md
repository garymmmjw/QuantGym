# QuantGuide Question

## 476. Random Triangle

**Metadata**

- ID: `1q8iJXA9qHNxvtOsRjVN`
- URL: https://www.quantguide.io/questions/random-triangle
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Jane Street
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-8 09:42:48 America/New_York
- Last Edited By: Gabe

### 题干

Three points are selected uniformly at random on the circumference of the unit circle and are labelled points $A,B,$ and $C$. Find the expected perimeter of the triangle $ABC$. The answer is in the form $\dfrac{a}{\pi}$ for a rational number $a$. Find $a$.

### Hint

Three points are selected uniformly at random on the perimeter of the unit circle and are labelled points $A,B,$ and $C$. Find the expected perimeter of the triangle $ABC$. The answer is in the form $\dfrac{a}{\pi}$ for a rational number $a$. Find $a$.

### 解答

The triangle is formed by drawing chords between each pair of points. As the points are IID, the three side lengths are exchangeable. This means that the expected perimeter is just obtained by tripling the expected length of one of the sides of the triangle. In other words, if $P$ is the perimeter and $S_{AB}$ is the length of the chord between points $A$ and $B$, $\mathbb{E}[P] = 3\mathbb{E}[S_{AB}]$. This question now boils down to finding the expected length of a chord drawn in a circle.  $$$$  Let $\theta$ and $\phi$ be IID $\text{Unif}(0,2\pi)$. Picking the two angles is equivalent to picking the two points uniform on the circumference. The measure of the angle between $\theta$ and $\phi$ is $\theta - \phi$. To get the length of the line segment connecting the two points, we can take a slight shortcut. The length here only depends on the distance between our points we select in terms of angle. In other words, regardless of where we end up having our points located, we can just rotate the circle so that one of them is located at $(1,0)$. Therefore, we can arbitrarily fix $\theta_1 = 0$. Thus, the length between $\theta_1 = 0$ and the point at $\theta_2 = \theta$ is $\sqrt{(1 - \cos(\theta))^2 + \sin^2(\theta)} = \sqrt{2} \sqrt{1 - \cos(\theta)}$. This means that finding the expected length of the chord is equivalent to finding $\sqrt{2}\mathbb{E}[\sqrt{1 - \cos(\theta)}]$, where $\theta \sim \text{Unif}(0,2\pi)$.   $$$$  Now, $\sqrt{2}\mathbb{E}[\sqrt{1 - \cos\theta}] = \dfrac{\sqrt{2}}{2\pi}\displaystyle \int_0^{2\pi}\sqrt{1-\cos\theta}d\theta$. Now, the best approach is to conjugate the interior by multiplying and dividing by $\sqrt{1+\cos\theta}$ so that we get $\sqrt{1-\cos^2\theta} = |\sin\theta|$. Doing this, we get $\dfrac{\sqrt{2}}{2\pi}\displaystyle \int_0^{2\pi} \dfrac{|\sin\theta|}{\sqrt{1+\cos\theta}}d\theta$.   $$$$  Note that the region on $(0,\pi)$ and $(\pi,2\pi)$, our integrand is symmetric, so we can just evaluate over one interval and double it. This means our new integral is $\dfrac{\sqrt{2}}{\pi} \displaystyle \int_0^{\pi} \dfrac{\sin\theta}{\sqrt{1+\cos\theta}}d\theta$. Let $u = 1 + \cos\theta$. Then $du = -\sin\theta d\theta$. Our bounds would respectively become $2$ and $0$, but the negative from the $du$ flips them back. Therefore, our new integral is $\dfrac{\sqrt{2}}{\pi} \displaystyle \int_0^2 u^{-\frac{1}{2}}du$. Evaluating this, we get $\dfrac{2\sqrt{2}}{\pi} \cdot \sqrt{u} \Big|_0^2 = \dfrac{4}{\pi}$.  $$$$  Thus, the expected perimeter of the triangle is $3 \times \dfrac{4}{\pi} = \dfrac{12}{\pi}$ and $a=12$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "12"
    ],
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "1q8iJXA9qHNxvtOsRjVN",
    "internalDifficulty": 4,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 09:42:48 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3815540,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Random Triangle",
    "topic": "probability",
    "urlEnding": "random-triangle",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      }
    ],
    "difficulty": "hard",
    "id": "1q8iJXA9qHNxvtOsRjVN",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Random Triangle",
    "topic": "probability",
    "urlEnding": "random-triangle"
  }
}
```
